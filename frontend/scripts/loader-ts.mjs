import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = pathResolve(scriptsDir, '..');
const srcRoot = pathResolve(frontendRoot, 'src');

const VIRTUAL_SHIMS = {
  vue: `
    export function ref(initial) {
      return { value: initial };
    }
    export function computed(getterOrOptions) {
      const getter = typeof getterOrOptions === 'function' ? getterOrOptions : getterOrOptions.get;
      return {
        get value() {
          return getter();
        }
      };
    }
    export function watch() {}
    export function onMounted() {}
  `,
  pinia: `
    let activePinia = new Map();
    export function createPinia() {
      return new Map();
    }
    export function setActivePinia(pinia) {
      activePinia = pinia;
    }
    export function defineStore(id, setup) {
      return function useStore() {
        if (!activePinia.has(id)) {
          const raw = setup();
          const proxy = new Proxy(raw, {
            get(target, prop) {
              const val = target[prop];
              if (val && typeof val === 'object' && 'value' in val) {
                return val.value;
              }
              return val;
            },
            set(target, prop, newVal) {
              const current = target[prop];
              if (current && typeof current === 'object' && 'value' in current) {
                current.value = newVal;
                return true;
              }
              target[prop] = newVal;
              return true;
            }
          });
          activePinia.set(id, proxy);
        }
        return activePinia.get(id);
      };
    }
  `,
  vitest: `
    export const suites = [];
    let currentSuite = null;
    export function describe(name, fn) {
      const suite = { name, beforeEachFns: [], tests: [] };
      const prev = currentSuite;
      currentSuite = suite;
      fn();
      currentSuite = prev;
      suites.push(suite);
    }
    export function beforeEach(fn) {
      if (currentSuite) currentSuite.beforeEachFns.push(fn);
    }
    export function it(name, fn) {
      if (currentSuite) currentSuite.tests.push({ name, fn });
    }
    export const test = it;
    export const vi = {
      fn(impl = () => {}) {
        const calls = [];
        const f = (...args) => {
          calls.push(args);
          return impl(...args);
        };
        f.mock = { calls };
        return f;
      }
    };
    export function expect(actual) {
      return {
        toBe(expected) {
          if (actual !== expected) {
            throw new Error(\`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
          }
        },
        toEqual(expected) {
          const a = JSON.stringify(actual);
          const b = JSON.stringify(expected);
          if (a !== b) {
            throw new Error(\`Expected deep equal \${b}, got \${a}\`);
          }
        },
        toHaveLength(len) {
          if (!actual || actual.length !== len) {
            throw new Error(\`Expected length \${len}, got \${actual?.length}\`);
          }
        },
        toContain(item) {
          if (typeof actual === 'string') {
            if (!actual.includes(item)) throw new Error(\`Expected "\${actual}" to contain "\${item}"\`);
            return;
          }
          if (!Array.isArray(actual) || !actual.includes(item)) {
            throw new Error(\`Expected array to contain \${JSON.stringify(item)}\`);
          }
        },
        toBeNull() {
          if (actual !== null) throw new Error(\`Expected null, got \${JSON.stringify(actual)}\`);
        },
        toBeTruthy() {
          if (!actual) throw new Error(\`Expected truthy, got \${JSON.stringify(actual)}\`);
        },
        toBeFalsy() {
          if (actual) throw new Error(\`Expected falsy, got \${JSON.stringify(actual)}\`);
        },
        toBeCloseTo(expected, precision = 2) {
          const diff = Math.abs(actual - expected);
          if (diff >= Math.pow(10, -precision) / 2) {
            throw new Error(\`Expected \${actual} to be close to \${expected}\`);
          }
        },
        toThrow(matcher) {
          let threw = false;
          let err = null;
          try {
            actual();
          } catch (e) {
            threw = true;
            err = e;
          }
          if (!threw) {
            throw new Error('Expected function to throw an error, but it did not throw.');
          }
          if (matcher instanceof RegExp && !matcher.test(err.message)) {
            throw new Error(\`Expected error message "\${err.message}" to match \${matcher}\`);
          }
          if (typeof matcher === 'string' && !err.message.includes(matcher)) {
            throw new Error(\`Expected error message "\${err.message}" to include "\${matcher}"\`);
          }
        }
      };
    }
  `,
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier in VIRTUAL_SHIMS) {
    return {
      url: `virtual:${specifier}`,
      shortCircuit: true,
    };
  }
  if (specifier.startsWith('@/')) {
    const targetPath = pathResolve(srcRoot, specifier.slice(2));
    const withTs = existsSync(targetPath) ? targetPath : `${targetPath}.ts`;
    return {
      url: pathToFileURL(withTs).href,
      shortCircuit: true,
    };
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const candidate = pathResolve(parentDir, specifier);
    if (!existsSync(candidate) && existsSync(`${candidate}.ts`)) {
      return {
        url: pathToFileURL(`${candidate}.ts`).href,
        shortCircuit: true,
      };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('virtual:')) {
    const name = url.slice('virtual:'.length);
    return {
      format: 'module',
      source: VIRTUAL_SHIMS[name],
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}

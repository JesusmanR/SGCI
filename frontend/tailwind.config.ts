import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      bodega: '390px', // Dispositivos móviles rugerizados y smartphones en almacén
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Paleta Oficial Aurora Mist - SGCI
        aurora: {
          profundo: '#203959',   // Navegación, fondos profundos y encabezados
          primario: '#416772',   // Acciones principales, botones y gráficas
          acento: '#96ADA5',     // Acentos, estados y elementos secundarios
          contraste: '#ABB7B3',  // Contraste claro y contenido sobre fondos oscuros
          desactivado: '#839492', // Textos secundarios, bordes y elementos desactivados
          
          // Alias semánticos operativos
          fondo: '#203959',
          accion: '#416772',
          estado: '#96ADA5',
          textoClaro: '#ABB7B3',
          borde: '#839492',
          
          // Variaciones tonales para interactividad accesible
          profundoHover: '#182b43',
          primarioHover: '#33525b',
          acentoHover: '#849d95',
          contrasteMuted: '#9aa7a2',
        },
      },
      minHeight: {
        'touch-bodega': '44px', // Touch target mínimo de accesibilidad en almacén con guantes
      },
      minWidth: {
        'touch-bodega': '44px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Courier New',
          'monospace',
        ],
      },
      boxShadow: {
        'aurora-subtle': '0 2px 8px -2px rgba(32, 57, 89, 0.15)',
        'aurora-card': '0 4px 16px -2px rgba(32, 57, 89, 0.20)',
        'aurora-focus': '0 0 0 3px rgba(65, 103, 114, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;

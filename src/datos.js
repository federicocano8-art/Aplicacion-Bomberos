// ============================================
// DATOS DEMO
// ============================================

export const vehiculosDemo = [
  {
    id: 1,
    nombre: 'TB-01',
    tipo: 'Camión Bomba',
    estado: 'operativo',
    fluidos: {
      aceite: { ok: true, fecha: '15/12/2024', observaciones: '' },
      refrigerante: { ok: true, fecha: '15/12/2024', observaciones: '' },
      combustible: { ok: true, fecha: '15/12/2024', observaciones: '' },
      liquidoFrenos: {
        ok: false,
        fecha: '15/12/2024',
        observaciones: 'Nivel bajo',
      },
    },
    erasAsignadas: [1],
    ubicaciones: [
      {
        id: 1,
        nombre: 'Compartimento 1',
        sububicaciones: [
          {
            id: 1,
            nombre: 'Bandeja Superior',
            herramientas: [
              {
                id: 1,
                nombre: 'Manguera 25mm',
                estado: 'ok',
                observaciones: '',
              },
              {
                id: 2,
                nombre: 'Manguera 70mm',
                estado: 'ok',
                observaciones: '',
              },
            ],
          },
          {
            id: 2,
            nombre: 'Bandeja Inferior',
            herramientas: [
              {
                id: 3,
                nombre: 'Lanza',
                estado: 'no-ok',
                observaciones: 'Fuga',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    nombre: 'TB-02',
    tipo: 'Camión Tanque',
    estado: 'mantenimiento',
    fluidos: {
      aceite: {
        ok: false,
        fecha: '10/12/2024',
        observaciones: 'Cambiar aceite',
      },
      refrigerante: { ok: true, fecha: '10/12/2024', observaciones: '' },
      combustible: { ok: true, fecha: '10/12/2024', observaciones: '' },
      liquidoFrenos: { ok: true, fecha: '10/12/2024', observaciones: '' },
    },
    erasAsignadas: [],
    ubicaciones: [],
  },
];

export const erasDemo = [
  {
    id: 1,
    marca: 'Dräger',
    modelo: 'PSS 7000',
    serial: 'DRG123456',
    presion: 300,
    estado: 'activo',
    ultimaMantenimiento: '10/12/2024',
    proximoMantenimiento: '10/03/2025',
  },
  {
    id: 2,
    marca: 'Scott',
    modelo: 'AP50',
    serial: 'SCT789012',
    presion: 280,
    estado: 'mantenimiento',
    ultimaMantenimiento: '05/12/2024',
    proximoMantenimiento: '05/01/2025',
  },
];

export const checklistsDemo = [
  {
    id: 1,
    nombre: 'Mensual TB-01',
    tipo: 'mensual',
    objetivo: 'TB-01',
    fecha: '15/12/2024',
    completado: false,
    vencido: true,
  },
  {
    id: 2,
    nombre: 'Quincenal ERA #001',
    tipo: 'quincenal',
    objetivo: 'ERA #001',
    fecha: '20/12/2024',
    completado: true,
    vencido: false,
  },
];

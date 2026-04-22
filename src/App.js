import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDTXhNePjZV4DqWRkRNFnDHQUmgWe1BoE0',
  authDomain: 'bomberos-ramallo.firebaseapp.com',
  projectId: 'bomberos-ramallo',
  storageBucket: 'bomberos-ramallo.firebasestorage.app',
  messagingSenderId: '526631464706',
  appId: '1:526631464706:web:73f13ed77fb078eaab5c1b',
  measurementId: 'G-BKPDRTXK9P',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function useColeccion(nombreColeccion) {
  var dataState = useState([]);
  var data = dataState[0];
  var setData = dataState[1];
  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var errorState = useState(null);
  var error = errorState[0];
  var setError = errorState[1];

  useEffect(
    function () {
      try {
        var q = query(
          collection(db, nombreColeccion),
          orderBy('creadoEn', 'desc')
        );
        var unsub = onSnapshot(
          q,
          function (snap) {
            var items = snap.docs.map(function (d) {
              return Object.assign({ id: d.id }, d.data());
            });
            setData(items);
            setLoading(false);
          },
          function (err) {
            setError(err.message);
            setLoading(false);
          }
        );
        return function () {
          unsub();
        };
      } catch (e) {
        setLoading(false);
      }
    },
    [nombreColeccion]
  );

  var agregar = useCallback(
    async function (item) {
      try {
        var ref = await addDoc(
          collection(db, nombreColeccion),
          Object.assign({}, item, {
            creadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp(),
          })
        );
        return ref.id;
      } catch (e) {
        setError(e.message);
        alert('Error al guardar: ' + e.message);
        return null;
      }
    },
    [nombreColeccion]
  );

  var actualizar = useCallback(
    async function (id, datos) {
      try {
        await updateDoc(
          doc(db, nombreColeccion, id),
          Object.assign({}, datos, { actualizadoEn: serverTimestamp() })
        );
      } catch (e) {
        setError(e.message);
      }
    },
    [nombreColeccion]
  );

  var eliminar = useCallback(
    async function (id) {
      try {
        await deleteDoc(doc(db, nombreColeccion, id));
      } catch (e) {
        setError(e.message);
      }
    },
    [nombreColeccion]
  );

  return { data, loading, error, agregar, actualizar, eliminar };
}

function useInventario() {
  var col = useColeccion('inventario');

  var descontarStock = useCallback(
    async function (itemId, cantidad, responsable, motivo) {
      var item = col.data.find(function (i) {
        return i.id === itemId;
      });
      if (!item) {
        alert('Item no encontrado');
        return false;
      }
      var nuevoStock = (item.stock || 0) - cantidad;
      if (nuevoStock < 0) {
        alert('Stock insuficiente. Stock actual: ' + (item.stock || 0));
        return false;
      }
      try {
        await updateDoc(doc(db, 'inventario', itemId), {
          stock: nuevoStock,
          actualizadoEn: serverTimestamp(),
        });
        await addDoc(collection(db, 'movimientos'), {
          tipo: 'salida',
          itemId: itemId,
          itemNombre: item.nombre,
          cantidad: cantidad,
          responsable: responsable || 'Sistema',
          motivo: motivo || '',
          creadoEn: serverTimestamp(),
        });
        return true;
      } catch (e) {
        alert('Error al descontar stock: ' + e.message);
        return false;
      }
    },
    [col.data]
  );

  var agregarStock = useCallback(
    async function (itemId, cantidad, responsable, motivo) {
      var item = col.data.find(function (i) {
        return i.id === itemId;
      });
      if (!item) {
        alert('Item no encontrado');
        return;
      }
      try {
        await updateDoc(doc(db, 'inventario', itemId), {
          stock: (item.stock || 0) + cantidad,
          actualizadoEn: serverTimestamp(),
        });
        await addDoc(collection(db, 'movimientos'), {
          tipo: 'entrada',
          itemId: itemId,
          itemNombre: item.nombre,
          cantidad: cantidad,
          responsable: responsable || 'Sistema',
          motivo: motivo || '',
          creadoEn: serverTimestamp(),
        });
      } catch (e) {
        alert('Error al agregar stock: ' + e.message);
      }
    },
    [col.data]
  );

  return Object.assign({}, col, {
    descontarStock: descontarStock,
    agregarStock: agregarStock,
    itemsBajoStock: col.data.filter(function (i) {
      return (i.stock || 0) <= (i.stockMinimo || 5);
    }),
  });
}

var styles = {
  container: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #dc2626 100%)',
    color: 'white',
    padding: '16px 24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  logo: { fontSize: '40px' },
  title: { fontSize: '22px', fontWeight: 'bold', margin: 0 },
  subtitle: { fontSize: '13px', opacity: 0.85, margin: 0 },
  main: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    gap: '24px',
  },
  nav: {
    width: '200px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  navBtn: {
    width: '100%',
    padding: '10px 14px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
  navBtnActive: {
    width: '100%',
    padding: '10px 14px',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
  },
  content: { flex: 1, minWidth: 0 },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#111827',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpi: {
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
  },
  btnLogout: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  badgeOk: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
  },
  badgeWarn: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
  },
  badgeErr: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
  },
};

function App() {
  var usuarioState = useState(null);
  var usuario = usuarioState[0];
  var setUsuario = usuarioState[1];
  var vistaState = useState('panel');
  var vista = vistaState[0];
  var setVista = vistaState[1];

  var vehiculosCol = useColeccion('vehiculos');
  var erasCol = useColeccion('eras');
  var personalCol = useColeccion('personal');
  var bitacoraCol = useColeccion('bitacora');
  var checklistsCol = useColeccion('checklists');
  var inventarioCol = useInventario();
  var equiposCol = useColeccion('equipos');
  var movimientosCol = useColeccion('movimientos');

  useEffect(function () {
    var sesion = localStorage.getItem('usuarioActual');
    if (sesion) setUsuario(JSON.parse(sesion));
  }, []);

  var iniciarSesion = function (email, password) {
    if (email && password) {
      var user = { nombre: email.split('@')[0], rol: 'bombero', email: email };
      localStorage.setItem('usuarioActual', JSON.stringify(user));
      setUsuario(user);
    }
  };

  var cerrarSesion = function () {
    localStorage.removeItem('usuarioActual');
    setUsuario(null);
  };

  var asignarERAaVehiculo = async function (vehiculoId, eraId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var erasActuales = vehiculo.erasAsignadas || [];
    if (erasActuales.includes(eraId)) {
      alert('Esta ERA ya está asignada');
      return;
    }
    await vehiculosCol.actualizar(vehiculoId, {
      erasAsignadas: erasActuales.concat([eraId]),
    });
    await erasCol.actualizar(eraId, { vehiculoAsignado: vehiculoId });
    alert('✅ ERA asignada correctamente');
  };

  var desasignarERAdeVehiculo = async function (vehiculoId, eraId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    await vehiculosCol.actualizar(vehiculoId, {
      erasAsignadas: (vehiculo.erasAsignadas || []).filter(function (id) {
        return id !== eraId;
      }),
    });
    await erasCol.actualizar(eraId, { vehiculoAsignado: '' });
  };

  var asignarEquipoAVehiculo = async function (vehiculoId, equipoId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var equiposActuales = vehiculo.equiposAsignados || [];
    if (equiposActuales.includes(equipoId)) {
      alert('Este equipo ya está asignado');
      return;
    }
    await vehiculosCol.actualizar(vehiculoId, {
      equiposAsignados: equiposActuales.concat([equipoId]),
    });
    await equiposCol.actualizar(equipoId, { vehiculoAsignado: vehiculoId });
    alert('✅ Equipo asignado correctamente');
  };

  var desasignarEquipoDeVehiculo = async function (vehiculoId, equipoId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    await vehiculosCol.actualizar(vehiculoId, {
      equiposAsignados: (vehiculo.equiposAsignados || []).filter(function (id) {
        return id !== equipoId;
      }),
    });
    await equiposCol.actualizar(equipoId, { vehiculoAsignado: '' });
  };

  var asignarItemAVehiculo = async function (vehiculoId, itemId, cantidad) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    var item = inventarioCol.data.find(function (i) {
      return i.id === itemId;
    });
    if (!vehiculo || !item) return;
    var ok = await inventarioCol.descontarStock(
      itemId,
      cantidad,
      usuario ? usuario.nombre : 'Sistema',
      'Asignado a ' + vehiculo.nombre
    );
    if (!ok) return;
    var itemsActuales = vehiculo.itemsAsignados || [];
    var existente = itemsActuales.find(function (x) {
      return x.itemId === itemId;
    });
    var nuevosItems = existente
      ? itemsActuales.map(function (x) {
          return x.itemId === itemId
            ? Object.assign({}, x, { cantidad: (x.cantidad || 0) + cantidad })
            : x;
        })
      : itemsActuales.concat([
          {
            itemId: itemId,
            cantidad: cantidad,
            nombre: item.nombre,
            categoria: item.categoria,
            unidad: item.unidad || 'u',
          },
        ]);
    await vehiculosCol.actualizar(vehiculoId, { itemsAsignados: nuevosItems });
    alert('✅ Item asignado correctamente');
  };

  var desasignarItemDeVehiculo = async function (vehiculoId, itemId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var itemAsignado = (vehiculo.itemsAsignados || []).find(function (x) {
      return x.itemId === itemId;
    });
    if (itemAsignado)
      await inventarioCol.agregarStock(
        itemId,
        itemAsignado.cantidad,
        usuario ? usuario.nombre : 'Sistema',
        'Devuelto de ' + vehiculo.nombre
      );
    await vehiculosCol.actualizar(vehiculoId, {
      itemsAsignados: (vehiculo.itemsAsignados || []).filter(function (x) {
        return x.itemId !== itemId;
      }),
    });
  };

  var actualizarCantidadItem = async function (
    vehiculoId,
    itemId,
    nuevaCantidad
  ) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    await vehiculosCol.actualizar(vehiculoId, {
      itemsAsignados: (vehiculo.itemsAsignados || []).map(function (x) {
        return x.itemId === itemId
          ? Object.assign({}, x, { cantidad: nuevaCantidad })
          : x;
      }),
    });
  };

  var agregarCompartimiento = async function (vehiculoId, nombre) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var comps = vehiculo.compartimientos || [];
    var nuevoComp = {
      id: Date.now().toString(),
      nombre: nombre,
      subcompartimientos: [],
    };
    await vehiculosCol.actualizar(vehiculoId, {
      compartimientos: comps.concat([nuevoComp]),
    });
  };

  var eliminarCompartimiento = async function (vehiculoId, compId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    await vehiculosCol.actualizar(vehiculoId, {
      compartimientos: (vehiculo.compartimientos || []).filter(function (c) {
        return c.id !== compId;
      }),
    });
  };

  var agregarSubcompartimiento = async function (vehiculoId, compId, nombre) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var comps = (vehiculo.compartimientos || []).map(function (c) {
      if (c.id !== compId) return c;
      var nuevoSub = { id: Date.now().toString(), nombre: nombre, items: [] };
      return Object.assign({}, c, {
        subcompartimientos: (c.subcompartimientos || []).concat([nuevoSub]),
      });
    });
    await vehiculosCol.actualizar(vehiculoId, { compartimientos: comps });
  };

  var eliminarSubcompartimiento = async function (vehiculoId, compId, subId) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var comps = (vehiculo.compartimientos || []).map(function (c) {
      if (c.id !== compId) return c;
      return Object.assign({}, c, {
        subcompartimientos: (c.subcompartimientos || []).filter(function (s) {
          return s.id !== subId;
        }),
      });
    });
    await vehiculosCol.actualizar(vehiculoId, { compartimientos: comps });
  };

  var agregarItemASubcompartimiento = async function (
    vehiculoId,
    compId,
    subId,
    itemInventarioId,
    cantidad
  ) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    var itemInv = inventarioCol.data.find(function (i) {
      return i.id === itemInventarioId;
    });
    if (!vehiculo || !itemInv) return;
    var comps = (vehiculo.compartimientos || []).map(function (c) {
      if (c.id !== compId) return c;
      var subs = (c.subcompartimientos || []).map(function (s) {
        if (s.id !== subId) return s;
        var itemsActuales = s.items || [];
        var existente = itemsActuales.find(function (x) {
          return x.itemId === itemInventarioId;
        });
        var nuevosItems = existente
          ? itemsActuales.map(function (x) {
              return x.itemId === itemInventarioId
                ? Object.assign({}, x, {
                    cantidadEsperada: (x.cantidadEsperada || 0) + cantidad,
                  })
                : x;
            })
          : itemsActuales.concat([
              {
                itemId: itemInventarioId,
                nombre: itemInv.nombre,
                categoria: itemInv.categoria,
                unidad: itemInv.unidad || 'u',
                cantidadEsperada: cantidad,
              },
            ]);
        return Object.assign({}, s, { items: nuevosItems });
      });
      return Object.assign({}, c, { subcompartimientos: subs });
    });
    await vehiculosCol.actualizar(vehiculoId, { compartimientos: comps });
  };

  var eliminarItemDeSubcompartimiento = async function (
    vehiculoId,
    compId,
    subId,
    itemId
  ) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var comps = (vehiculo.compartimientos || []).map(function (c) {
      if (c.id !== compId) return c;
      var subs = (c.subcompartimientos || []).map(function (s) {
        if (s.id !== subId) return s;
        return Object.assign({}, s, {
          items: (s.items || []).filter(function (x) {
            return x.itemId !== itemId;
          }),
        });
      });
      return Object.assign({}, c, { subcompartimientos: subs });
    });
    await vehiculosCol.actualizar(vehiculoId, { compartimientos: comps });
  };

  var actualizarCantidadItemSubcomp = async function (
    vehiculoId,
    compId,
    subId,
    itemId,
    nuevaCantidad
  ) {
    var vehiculo = vehiculosCol.data.find(function (v) {
      return v.id === vehiculoId;
    });
    if (!vehiculo) return;
    var comps = (vehiculo.compartimientos || []).map(function (c) {
      if (c.id !== compId) return c;
      var subs = (c.subcompartimientos || []).map(function (s) {
        if (s.id !== subId) return s;
        return Object.assign({}, s, {
          items: (s.items || []).map(function (x) {
            return x.itemId === itemId
              ? Object.assign({}, x, { cantidadEsperada: nuevaCantidad })
              : x;
          }),
        });
      });
      return Object.assign({}, c, { subcompartimientos: subs });
    });
    await vehiculosCol.actualizar(vehiculoId, { compartimientos: comps });
  };

  if (!usuario) return React.createElement(Login, { onLogin: iniciarSesion });

  var loading = vehiculosCol.loading || inventarioCol.loading;
  if (loading) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f3f4f6',
        },
      },
      React.createElement(
        'div',
        { style: { textAlign: 'center' } },
        React.createElement(
          'div',
          { style: { fontSize: '64px', marginBottom: '16px' } },
          '🚒'
        ),
        React.createElement(
          'p',
          { style: { color: '#6b7280', fontSize: '18px' } },
          'Cargando sistema...'
        )
      )
    );
  }

  var navItems = [
    { key: 'panel', label: '🏠 Panel' },
    { key: 'vehiculos', label: '🚛 Móviles' },
    { key: 'inventario', label: '📦 Inventario' },
    { key: 'panol', label: '🧰 Pañol' },
    { key: 'equipos', label: '🧯 Equipos' },
    { key: 'eras', label: '🎽 ERAs' },
    { key: 'checklists', label: '📋 Checklists' },
    { key: 'personal', label: '👥 Personal' },
    { key: 'bitacora', label: '📝 Bitácora' },
  ];

  return React.createElement(
    'div',
    { style: styles.container },
    React.createElement(
      'header',
      { style: styles.header },
      React.createElement(
        'div',
        { style: styles.headerContent },
        React.createElement('div', { style: styles.logo }, '🚒'),
        React.createElement(
          'div',
          null,
          React.createElement(
            'h1',
            { style: styles.title },
            'Gestión de Bomberos'
          ),
          React.createElement(
            'p',
            { style: styles.subtitle },
            '👤 ' + usuario.nombre + ' | ' + usuario.rol
          )
        ),
        inventarioCol.itemsBajoStock.length > 0 &&
          React.createElement(
            'div',
            {
              style: {
                marginLeft: '16px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
              },
              onClick: function () {
                setVista('inventario');
              },
            },
            React.createElement(
              'span',
              {
                style: {
                  color: '#92400e',
                  fontWeight: '600',
                  fontSize: '13px',
                },
              },
              '⚠️ ' + inventarioCol.itemsBajoStock.length + ' items bajo stock'
            )
          ),
        React.createElement(
          'div',
          { style: { marginLeft: 'auto' } },
          React.createElement(
            'button',
            { style: styles.btnLogout, onClick: cerrarSesion },
            '🚪 Salir'
          )
        )
      )
    ),
    React.createElement(
      'div',
      { style: styles.main },
      React.createElement(
        'nav',
        { style: styles.nav },
        navItems.map(function (item) {
          return React.createElement(
            'button',
            {
              key: item.key,
              style: vista === item.key ? styles.navBtnActive : styles.navBtn,
              onClick: function () {
                setVista(item.key);
              },
            },
            item.label
          );
        })
      ),
      React.createElement(
        'div',
        { style: styles.content },
        vista === 'panel' &&
          React.createElement(Panel, {
            vehiculos: vehiculosCol.data,
            eras: erasCol.data,
            checklists: checklistsCol.data,
            personal: personalCol.data,
            inventario: inventarioCol.data,
            equipos: equiposCol.data,
            itemsBajoStock: inventarioCol.itemsBajoStock,
            setVista: setVista,
          }),
        vista === 'vehiculos' &&
          React.createElement(Vehiculos, {
            vehiculos: vehiculosCol.data,
            eras: erasCol.data,
            inventario: inventarioCol.data,
            equipos: equiposCol.data,
            onAgregar: async function (datos) {
              var id = await vehiculosCol.agregar(
                Object.assign({}, datos, {
                  erasAsignadas: [],
                  equiposAsignados: [],
                  itemsAsignados: [],
                  compartimientos: [],
                })
              );
              if (id) alert('✅ Móvil agregado correctamente');
            },
            onActualizar: vehiculosCol.actualizar,
            onEliminar: vehiculosCol.eliminar,
            onAsignarItem: asignarItemAVehiculo,
            onDesasignarItem: desasignarItemDeVehiculo,
            onActualizarCantidadItem: actualizarCantidadItem,
            onAsignarERA: asignarERAaVehiculo,
            onDesasignarERA: desasignarERAdeVehiculo,
            onAsignarEquipo: asignarEquipoAVehiculo,
            onDesasignarEquipo: desasignarEquipoDeVehiculo,
            onAgregarCompartimiento: agregarCompartimiento,
            onEliminarCompartimiento: eliminarCompartimiento,
            onAgregarSubcompartimiento: agregarSubcompartimiento,
            onEliminarSubcompartimiento: eliminarSubcompartimiento,
            onAgregarItemSubcomp: agregarItemASubcompartimiento,
            onEliminarItemSubcomp: eliminarItemDeSubcompartimiento,
            onActualizarCantidadItemSubcomp: actualizarCantidadItemSubcomp,
            usuario: usuario,
          }),
        vista === 'inventario' &&
          React.createElement(Inventario, {
            inventario: inventarioCol.data,
            movimientos: movimientosCol.data,
            onAgregar: inventarioCol.agregar,
            onActualizar: inventarioCol.actualizar,
            onEliminar: inventarioCol.eliminar,
            onDescontar: inventarioCol.descontarStock,
            onAgregarStock: inventarioCol.agregarStock,
            itemsBajoStock: inventarioCol.itemsBajoStock,
            usuario: usuario,
          }),
        vista === 'panol' &&
          React.createElement(Panol, {
            inventario: inventarioCol.data,
            movimientos: movimientosCol.data,
            onDescontar: inventarioCol.descontarStock,
            onAgregarStock: inventarioCol.agregarStock,
            usuario: usuario,
          }),
        vista === 'equipos' &&
          React.createElement(Equipos, {
            equipos: equiposCol.data,
            vehiculos: vehiculosCol.data,
            inventario: inventarioCol.data,
            onAgregar: equiposCol.agregar,
            onActualizar: equiposCol.actualizar,
            onEliminar: equiposCol.eliminar,
            onAsignarEquipo: asignarEquipoAVehiculo,
            onDesasignarEquipo: desasignarEquipoDeVehiculo,
            usuario: usuario,
          }),
        vista === 'eras' &&
          React.createElement(ERAs, {
            eras: erasCol.data,
            vehiculos: vehiculosCol.data,
            onAgregar: erasCol.agregar,
            onActualizar: erasCol.actualizar,
            onEliminar: erasCol.eliminar,
            onAsignarERA: asignarERAaVehiculo,
            onDesasignarERA: desasignarERAdeVehiculo,
          }),
        vista === 'checklists' &&
          React.createElement(Checklists, {
            vehiculos: vehiculosCol.data,
            eras: erasCol.data,
            usuario: usuario,
            checklists: checklistsCol.data,
            inventario: inventarioCol.data,
            onGuardar: checklistsCol.agregar,
            onActualizar: checklistsCol.actualizar,
            onEliminar: checklistsCol.eliminar,
            onDescontarStock: inventarioCol.descontarStock,
          }),
        vista === 'personal' &&
          React.createElement(Personal, {
            personal: personalCol.data,
            onAgregar: personalCol.agregar,
            onActualizar: personalCol.actualizar,
            onEliminar: personalCol.eliminar,
          }),
        vista === 'bitacora' &&
          React.createElement(Bitacora, {
            bitacora: bitacoraCol.data,
            vehiculos: vehiculosCol.data,
            eras: erasCol.data,
            equipos: equiposCol.data,
            inventario: inventarioCol.data,
            personal: personalCol.data,
            onAgregar: bitacoraCol.agregar,
            onActualizar: bitacoraCol.actualizar,
            onEliminar: bitacoraCol.eliminar,
          })
      )
    )
  );
}

// ============================================
// EQUIPOS - CON PROVEEDOR, CÓDIGO INTERNO Y ASIGNACIÓN A MÓVIL
// ============================================
function Equipos(props) {
  var formInicial = {
    nombre: '',
    tipo: '',
    codigoInterno: '',
    serial: '',
    estado: 'operativo',
    vencimiento: '',
    ubicacion: '',
    observaciones: '',
    proveedor: { nombre: '', contacto: '', telefono: '', email: '', web: '' },
  };
  var formState = useState(formInicial);
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var expandidoState = useState(null);
  var expandido = expandidoState[0];
  var setExpandido = expandidoState[1];
  var asignarVehState = useState('');
  var asignarVeh = asignarVehState[0];
  var setAsignarVeh = asignarVehState[1];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var iniciarEdicion = function (eq) {
    setEditando(eq.id);
    setFormEdit({
      nombre: eq.nombre || '',
      tipo: eq.tipo || '',
      codigoInterno: eq.codigoInterno || '',
      serial: eq.serial || '',
      estado: eq.estado || 'operativo',
      vencimiento: eq.vencimiento || '',
      ubicacion: eq.ubicacion || '',
      observaciones: eq.observaciones || '',
      proveedor: eq.proveedor || {
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        web: '',
      },
    });
  };

  var guardarEdicion = async function (eqId) {
    await props.onActualizar(eqId, formEdit);
    setEditando(null);
    alert('✅ Equipo actualizado correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    var id = await props.onAgregar(form);
    if (id) {
      setForm(formInicial);
      setMostrarForm(false);
      alert('✅ Equipo agregado');
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '🧯 Equipos'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Equipo'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#fff7ed',
            border: '2px solid #fed7aa',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#c2410c' }) },
          '➕ Nuevo Equipo'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Nombre *'),
              React.createElement('input', {
                type: 'text',
                value: form.nombre,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { nombre: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Ej: Extintor CO2',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Tipo'),
              React.createElement('input', {
                type: 'text',
                value: form.tipo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { tipo: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Ej: Extintor, Manguera...',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                '🏷️ Código Interno'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.codigoInterno,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { codigoInterno: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Ej: EQ-001',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Serial/N° Serie'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.serial,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { serial: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Número de serie',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Estado'),
              React.createElement(
                'select',
                {
                  value: form.estado,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { estado: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                React.createElement(
                  'option',
                  { value: 'operativo' },
                  'Operativo'
                ),
                React.createElement(
                  'option',
                  { value: 'mantenimiento' },
                  'En Mantenimiento'
                ),
                React.createElement('option', { value: 'baja' }, 'Baja')
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Vencimiento'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.vencimiento,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { vencimiento: e.target.value })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Ubicación'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.ubicacion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { ubicacion: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Ej: Depósito A',
              })
            ),
            React.createElement(
              'div',
              { style: { gridColumn: 'span 2' } },
              React.createElement(
                'label',
                { style: styles.label },
                'Observaciones'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.observaciones,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { observaciones: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Observaciones...',
              })
            )
          ),
          React.createElement(
            'div',
            {
              style: {
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'h4',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '12px',
                },
              },
              '🏢 Datos del Proveedor'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                },
              },
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Nombre Proveedor'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.nombre,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          nombre: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Empresa proveedora',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Contacto'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.contacto,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          contacto: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Nombre del contacto',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Teléfono'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.telefono,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          telefono: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Tel. proveedor',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { style: styles.label }, 'Email'),
                React.createElement('input', {
                  type: 'email',
                  value: form.proveedor.email,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          email: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'email@proveedor.com',
                })
              ),
              React.createElement(
                'div',
                { style: { gridColumn: 'span 2' } },
                React.createElement('label', { style: styles.label }, 'Web'),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.web,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          web: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'www.proveedor.com',
                })
              )
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Agregar Equipo'
          )
        )
      ),

    props.equipos.length === 0
      ? React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, {
              textAlign: 'center',
              padding: '60px',
            }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '64px', marginBottom: '16px' } },
            '🧯'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay equipos registrados'
          )
        )
      : React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          props.equipos.map(function (eq) {
            var venc = verificarVencimiento(eq.vencimiento);
            var tieneAlerta = venc === 'vencido';
            var isEditando = editando === eq.id;
            var isExpandido = expandido === eq.id;
            var vehiculoAsig = eq.vehiculoAsignado
              ? props.vehiculos.find(function (v) {
                  return v.id === eq.vehiculoAsignado;
                })
              : null;
            var prov = eq.proveedor || {};

            return React.createElement(
              'div',
              {
                key: eq.id,
                style: Object.assign({}, styles.card, {
                  border: '2px solid ' + (tieneAlerta ? '#ef4444' : '#e5e7eb'),
                  background: tieneAlerta ? '#fef2f2' : 'white',
                  marginBottom: '0',
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  },
                  onClick: function () {
                    setExpandido(isExpandido ? null : eq.id);
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      },
                    },
                    '🧯'
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '2px',
                        },
                      },
                      eq.nombre
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        },
                      },
                      eq.codigoInterno &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🏷️ ' + eq.codigoInterno
                        ),
                      eq.tipo &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '11px', color: '#6b7280' } },
                          eq.tipo
                        ),
                      eq.serial &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '11px', color: '#6b7280' } },
                          'S/N: ' + eq.serial
                        ),
                      vehiculoAsig &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🚛 ' + vehiculoAsig.nombre
                        ),
                      prov.nombre &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            },
                          },
                          '🏢 ' + prov.nombre
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style:
                        eq.estado === 'operativo'
                          ? styles.badgeOk
                          : styles.badgeWarn,
                    },
                    eq.estado === 'operativo'
                      ? '✓ OPERATIVO'
                      : eq.estado === 'mantenimiento'
                      ? '🔧 MANT.'
                      : '⛔ BAJA'
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '18px', color: '#6b7280' } },
                    isExpandido ? '▲' : '▼'
                  )
                )
              ),

              isExpandido &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '20px',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '20px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                      },
                    },
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          iniciarEdicion(eq);
                        },
                      },
                      '                  ✏️ Editar'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          if (window.confirm('¿Eliminar ' + eq.nombre + '?')) {
                            props.onEliminar(eq.id);
                          }
                        },
                      },
                      '🗑️ Eliminar'
                    )
                  ),

                  isEditando &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f0f9ff',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '2px solid #0ea5e9',
                          marginBottom: '16px',
                        },
                      },
                      React.createElement(
                        'h4',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#0369a1',
                            marginBottom: '16px',
                          },
                        },
                        '✏️ Editando: ' + eq.nombre
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Nombre'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.nombre || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  nombre: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Tipo'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.tipo || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  tipo: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            '🏷️ Código Interno'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.codigoInterno || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  codigoInterno: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Serial'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.serial || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  serial: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Estado'
                          ),
                          React.createElement(
                            'select',
                            {
                              value: formEdit.estado || 'operativo',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    estado: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            },
                            React.createElement(
                              'option',
                              { value: 'operativo' },
                              'Operativo'
                            ),
                            React.createElement(
                              'option',
                              { value: 'mantenimiento' },
                              'En Mantenimiento'
                            ),
                            React.createElement(
                              'option',
                              { value: 'baja' },
                              'Baja'
                            )
                          )
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Vencimiento'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: formEdit.vencimiento || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  vencimiento: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Ubicación'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.ubicacion || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  ubicacion: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          { style: { gridColumn: 'span 2' } },
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Observaciones'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.observaciones || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  observaciones: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        )
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '10px',
                            padding: '14px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'h5',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#92400e',
                              marginBottom: '10px',
                            },
                          },
                          '🏢 Datos del Proveedor'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '10px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Nombre'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).nombre || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { nombre: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Contacto'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).contacto || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { contacto: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Teléfono'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).telefono || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { telefono: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Email'
                            ),
                            React.createElement('input', {
                              type: 'email',
                              value: (formEdit.proveedor || {}).email || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { email: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 2' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Web'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).web || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { web: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          )
                        )
                      ),
                      React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '10px' } },
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              guardarEdicion(eq.id);
                            },
                          },
                          '💾 Guardar'
                        ),
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              setEditando(null);
                            },
                          },
                          '✖ Cancelar'
                        )
                      )
                    ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px',
                      },
                    },
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f9fafb',
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#374151',
                            marginBottom: '10px',
                          },
                        },
                        '📋 Información General'
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          },
                        },
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px' } },
                          '🏷️ Código: ' + (eq.codigoInterno || 'N/D')
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px' } },
                          '🔖 Serial: ' + (eq.serial || 'N/D')
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px' } },
                          '📍 Ubicación: ' + (eq.ubicacion || 'N/D')
                        ),
                        eq.vencimiento &&
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '13px',
                                color:
                                  venc === 'vencido'
                                    ? '#dc2626'
                                    : venc === 'proximo'
                                    ? '#d97706'
                                    : '#374151',
                                fontWeight: venc !== 'ok' ? '600' : '400',
                              },
                            },
                            '📅 Vence: ' +
                              eq.vencimiento +
                              (venc === 'vencido'
                                ? ' ⚠️ VENCIDO'
                                : venc === 'proximo'
                                ? ' ⚠️ PRÓXIMO'
                                : ' ✓')
                          ),
                        eq.observaciones &&
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '13px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                              },
                            },
                            '💬 ' + eq.observaciones
                          )
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#fefce8',
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid #fde68a',
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#92400e',
                            marginBottom: '10px',
                          },
                        },
                        '🏢 Proveedor'
                      ),
                      prov.nombre
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              },
                            },
                            React.createElement(
                              'p',
                              {
                                style: { fontSize: '13px', fontWeight: '600' },
                              },
                              '🏢 ' + prov.nombre
                            ),
                            prov.contacto &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '👤 ' + prov.contacto
                              ),
                            prov.telefono &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '📞 ' + prov.telefono
                              ),
                            prov.email &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '✉️ ' + prov.email
                              ),
                            prov.web &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '🌐 ' + prov.web
                              )
                          )
                        : React.createElement(
                            'p',
                            { style: { fontSize: '13px', color: '#9ca3af' } },
                            'Sin datos de proveedor'
                          )
                    )
                  ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        background: '#f0fdf4',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '1px solid #bbf7d0',
                      },
                    },
                    React.createElement(
                      'h5',
                      {
                        style: {
                          fontWeight: 'bold',
                          color: '#15803d',
                          marginBottom: '12px',
                        },
                      },
                      '🚛 Asignación a Móvil'
                    ),
                    vehiculoAsig
                      ? React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#15803d',
                              },
                            },
                            '✅ Asignado a: ' + vehiculoAsig.nombre
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 14px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                if (
                                  window.confirm(
                                    '¿Desasignar equipo del móvil?'
                                  )
                                ) {
                                  props.onDesasignarEquipo(
                                    vehiculoAsig.id,
                                    eq.id
                                  );
                                }
                              },
                            },
                            '↩️ Desasignar'
                          )
                        )
                      : React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'select',
                            {
                              value: asignarVeh,
                              onChange: function (e) {
                                setAsignarVeh(e.target.value);
                              },
                              style: Object.assign({}, styles.input, {
                                flex: 1,
                              }),
                            },
                            React.createElement(
                              'option',
                              { value: '' },
                              'Seleccionar móvil...'
                            ),
                            props.vehiculos.map(function (v) {
                              return React.createElement(
                                'option',
                                { key: v.id, value: v.id },
                                v.nombre
                              );
                            })
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 16px',
                                background: '#15803d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function () {
                                if (!asignarVeh) {
                                  alert('Seleccioná un móvil');
                                  return;
                                }
                                props.onAsignarEquipo(asignarVeh, eq.id);
                                setAsignarVeh('');
                              },
                            },
                            '➕ Asignar'
                          )
                        )
                  )
                )
            );
          })
        )
  );
}

// ============================================
// ERAs - CON PROVEEDOR, CÓDIGO INTERNO Y ASIGNACIÓN A MÓVIL
// ============================================
function ERAs(props) {
  var formInicial = {
    marca: '',
    modelo: '',
    codigoInterno: '',
    serial: '',
    presion: 300,
    estado: 'activo',
    pruebaHidraulica: '',
    vencimientoTubo: '',
    observaciones: '',
    proveedor: { nombre: '', contacto: '', telefono: '', email: '', web: '' },
  };
  var formState = useState(formInicial);
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var expandidoState = useState(null);
  var expandido = expandidoState[0];
  var setExpandido = expandidoState[1];
  var asignarVehState = useState('');
  var asignarVeh = asignarVehState[0];
  var setAsignarVeh = asignarVehState[1];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var iniciarEdicion = function (era) {
    setEditando(era.id);
    setFormEdit({
      marca: era.marca || '',
      modelo: era.modelo || '',
      codigoInterno: era.codigoInterno || '',
      serial: era.serial || '',
      presion: era.presion || 300,
      estado: era.estado || 'activo',
      pruebaHidraulica: era.pruebaHidraulica || '',
      vencimientoTubo: era.vencimientoTubo || '',
      observaciones: era.observaciones || '',
      proveedor: era.proveedor || {
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        web: '',
      },
    });
  };

  var guardarEdicion = async function (eraId) {
    await props.onActualizar(eraId, formEdit);
    setEditando(null);
    alert('✅ ERA actualizada correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.marca.trim() || !form.serial.trim()) {
      alert('Marca y serial son obligatorios');
      return;
    }
    var id = await props.onAgregar(form);
    if (id) {
      setForm(formInicial);
      setMostrarForm(false);
      alert('✅ ERA agregada');
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '🎽 ERAs'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nueva ERA'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f5f3ff',
            border: '2px solid #ddd6fe',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#7c3aed' }) },
          '➕ Nueva ERA'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Marca *'),
              React.createElement('input', {
                type: 'text',
                value: form.marca,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { marca: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Ej: MSA',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Modelo'),
              React.createElement('input', {
                type: 'text',
                value: form.modelo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { modelo: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Ej: AirMaXX',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                '🏷️ Código Interno'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.codigoInterno,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { codigoInterno: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Ej: ERA-001',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Serial *'),
              React.createElement('input', {
                type: 'text',
                value: form.serial,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { serial: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Número de serie',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Presión (bar)'
              ),
              React.createElement('input', {
                type: 'number',
                value: form.presion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      presion: parseInt(e.target.value) || 0,
                    })
                  );
                },
                style: styles.input,
                min: '0',
                max: '300',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Estado'),
              React.createElement(
                'select',
                {
                  value: form.estado,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { estado: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: 'activo' }, 'Activo'),
                React.createElement(
                  'option',
                  { value: 'mantenimiento' },
                  'En Mantenimiento'
                ),
                React.createElement('option', { value: 'baja' }, 'Baja')
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Prueba Hidráulica'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.pruebaHidraulica,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      pruebaHidraulica: e.target.value,
                    })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Venc. Tubo'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.vencimientoTubo,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { vencimientoTubo: e.target.value })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Observaciones'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.observaciones,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { observaciones: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Observaciones...',
              })
            )
          ),
          React.createElement(
            'div',
            {
              style: {
                background: '#ede9fe',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'h4',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#7c3aed',
                  marginBottom: '12px',
                },
              },
              '🏢 Datos del Proveedor'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                },
              },
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Nombre Proveedor'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.nombre,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          nombre: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Empresa proveedora',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Contacto'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.contacto,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          contacto: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Nombre del contacto',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Teléfono'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.telefono,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          telefono: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Tel. proveedor',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { style: styles.label }, 'Email'),
                React.createElement('input', {
                  type: 'email',
                  value: form.proveedor.email,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          email: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'email@proveedor.com',
                })
              ),
              React.createElement(
                'div',
                { style: { gridColumn: 'span 2' } },
                React.createElement('label', { style: styles.label }, 'Web'),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedor.web,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedor: Object.assign({}, form.proveedor, {
                          web: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'www.proveedor.com',
                })
              )
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Agregar ERA'
          )
        )
      ),

    props.eras.length === 0
      ? React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, {
              textAlign: 'center',
              padding: '60px',
            }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '64px', marginBottom: '16px' } },
            '🎽'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay ERAs registradas'
          )
        )
      : React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          props.eras.map(function (era) {
            var vencTubo = verificarVencimiento(era.vencimientoTubo);
            var vencPH = verificarVencimiento(era.pruebaHidraulica);
            var tieneAlerta = vencTubo === 'vencido' || vencPH === 'vencido';
            var vehiculoAsig = era.vehiculoAsignado
              ? props.vehiculos.find(function (v) {
                  return v.id === era.vehiculoAsignado;
                })
              : null;
            var isEditando = editando === era.id;
            var isExpandido = expandido === era.id;
            var prov = era.proveedor || {};

            return React.createElement(
              'div',
              {
                key: era.id,
                style: Object.assign({}, styles.card, {
                  border: '2px solid ' + (tieneAlerta ? '#ef4444' : '#ddd6fe'),
                  background: tieneAlerta ? '#fef2f2' : 'white',
                  marginBottom: '0',
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  },
                  onClick: function () {
                    setExpandido(isExpandido ? null : era.id);
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '50px',
                        height: '50px',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      },
                    },
                    '🎽'
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '2px',
                        },
                      },
                      era.marca + ' ' + era.modelo
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        },
                      },
                      era.codigoInterno &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#ede9fe',
                              color: '#7c3aed',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🏷️ ' + era.codigoInterno
                        ),
                      React.createElement(
                        'span',
                        { style: { fontSize: '11px', color: '#6b7280' } },
                        '🔖 ' + era.serial
                      ),
                      vehiculoAsig &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🚛 ' + vehiculoAsig.nombre
                        ),
                      prov.nombre &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            },
                          },
                          '🏢 ' + prov.nombre
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: {
                        background:
                          (era.presion || 0) >= 280 ? '#d1fae5' : '#fee2e2',
                        color:
                          (era.presion || 0) >= 280 ? '#065f46' : '#dc2626',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                      },
                    },
                    (era.presion || 0) + ' bar'
                  ),
                  React.createElement(
                    'span',
                    {
                      style:
                        era.estado === 'activo'
                          ? styles.badgeOk
                          : styles.badgeWarn,
                    },
                    era.estado === 'activo'
                      ? '✓ ACTIVA'
                      : era.estado === 'mantenimiento'
                      ? '🔧 MANT.'
                      : '⛔ BAJA'
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '18px', color: '#6b7280' } },
                    isExpandido ? '▲' : '▼'
                  )
                )
              ),

              isExpandido &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '20px',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '20px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                      },
                    },
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          iniciarEdicion(era);
                        },
                      },
                      '✏️ Editar'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          if (
                            window.confirm('¿Eliminar ERA ' + era.serial + '?')
                          ) {
                            props.onEliminar(era.id);
                          }
                        },
                      },
                      '🗑️ Eliminar'
                    )
                  ),

                  isEditando &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f0f9ff',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '2px solid #0ea5e9',
                          marginBottom: '16px',
                        },
                      },
                      React.createElement(
                        'h4',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#0369a1',
                            marginBottom: '16px',
                          },
                        },
                        '✏️ Editando ERA: ' + era.marca + ' ' + era.modelo
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Marca'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.marca || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  marca: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Modelo'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.modelo || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  modelo: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            '🏷️ Código Interno'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.codigoInterno || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  codigoInterno: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Serial'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.serial || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  serial: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Presión (bar)'
                          ),
                          React.createElement('input', {
                            type: 'number',
                            value: formEdit.presion || 0,
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  presion: parseInt(e.target.value) || 0,
                                })
                              );
                            },
                            style: styles.input,
                            min: '0',
                            max: '300',
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Estado'
                          ),
                          React.createElement(
                            'select',
                            {
                              value: formEdit.estado || 'activo',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    estado: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            },
                            React.createElement(
                              'option',
                              { value: 'activo' },
                              'Activo'
                            ),
                            React.createElement(
                              'option',
                              { value: 'mantenimiento' },
                              'En Mantenimiento'
                            ),
                            React.createElement(
                              'option',
                              { value: 'baja' },
                              'Baja'
                            )
                          )
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Prueba Hidráulica'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: formEdit.pruebaHidraulica || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  pruebaHidraulica: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Venc. Tubo'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: formEdit.vencimientoTubo || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  vencimientoTubo: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Observaciones'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.observaciones || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  observaciones: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        )
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#ede9fe',
                            border: '1px solid #ddd6fe',
                            borderRadius: '10px',
                            padding: '14px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'h5',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#7c3aed',
                              marginBottom: '10px',
                            },
                          },
                          '🏢 Datos del Proveedor'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '10px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Nombre'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).nombre || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { nombre: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Contacto'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).contacto || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { contacto: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Teléfono'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).telefono || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { telefono: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Email'
                            ),
                            React.createElement('input', {
                              type: 'email',
                              value: (formEdit.proveedor || {}).email || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { email: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 2' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Web'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.proveedor || {}).web || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    proveedor: Object.assign(
                                      {},
                                      formEdit.proveedor || {},
                                      { web: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          )
                        )
                      ),
                      React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '10px' } },
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              guardarEdicion(era.id);
                            },
                          },
                          '💾 Guardar'
                        ),
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              setEditando(null);
                            },
                          },
                          '✖ Cancelar'
                        )
                      )
                    ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px',
                      },
                    },
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f5f3ff',
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid #ddd6fe',
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#7c3aed',
                            marginBottom: '10px',
                          },
                        },
                        '📋 Información General'
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          },
                        },
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px' } },
                          '🏷️ Código: ' + (era.codigoInterno || 'N/D')
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px' } },
                          '🔖 Serial: ' + (era.serial || 'N/D')
                        ),
                        React.createElement(
                          'p',
                          {
                            style: {
                              fontSize: '13px',
                              fontWeight: '600',
                              color:
                                (era.presion || 0) >= 280
                                  ? '#059669'
                                  : '#dc2626',
                            },
                          },
                          '💨 Presión: ' + (era.presion || 0) + ' bar'
                        ),
                        era.pruebaHidraulica &&
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '13px',
                                color:
                                  vencPH === 'vencido'
                                    ? '#dc2626'
                                    : vencPH === 'proximo'
                                    ? '#d97706'
                                    : '#374151',
                                fontWeight: vencPH !== 'ok' ? '600' : '400',
                              },
                            },
                            '🔧 PH: ' +
                              era.pruebaHidraulica +
                              (vencPH === 'vencido'
                                ? ' ⚠️ VENCIDA'
                                : vencPH === 'proximo'
                                ? ' ⚠️ PRÓXIMA'
                                : ' ✓')
                          ),
                        era.vencimientoTubo &&
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '13px',
                                color:
                                  vencTubo === 'vencido'
                                    ? '#dc2626'
                                    : vencTubo === 'proximo'
                                    ? '#d97706'
                                    : '#374151',
                                fontWeight: vencTubo !== 'ok' ? '600' : '400',
                              },
                            },
                            '🧪 Tubo: ' +
                              era.vencimientoTubo +
                              (vencTubo === 'vencido'
                                ? ' ⚠️ VENCIDO'
                                : vencTubo === 'proximo'
                                ? ' ⚠️ PRÓXIMO'
                                : ' ✓')
                          ),
                        era.observaciones &&
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '13px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                              },
                            },
                            '💬 ' + era.observaciones
                          )
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#fefce8',
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid #fde68a',
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#92400e',
                            marginBottom: '10px',
                          },
                        },
                        '🏢 Proveedor'
                      ),
                      prov.nombre
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              },
                            },
                            React.createElement(
                              'p',
                              {
                                style: { fontSize: '13px', fontWeight: '600' },
                              },
                              '🏢 ' + prov.nombre
                            ),
                            prov.contacto &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '👤 ' + prov.contacto
                              ),
                            prov.telefono &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '📞 ' + prov.telefono
                              ),
                            prov.email &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '✉️ ' + prov.email
                              ),
                            prov.web &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '🌐 ' + prov.web
                              )
                          )
                        : React.createElement(
                            'p',
                            { style: { fontSize: '13px', color: '#9ca3af' } },
                            'Sin datos de proveedor'
                          )
                    )
                  ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        background: '#f0fdf4',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '1px solid #bbf7d0',
                      },
                    },
                    React.createElement(
                      'h5',
                      {
                        style: {
                          fontWeight: 'bold',
                          color: '#15803d',
                          marginBottom: '12px',
                        },
                      },
                      '🚛 Asignación a Móvil'
                    ),
                    vehiculoAsig
                      ? React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#15803d',
                              },
                            },
                            '✅ Asignada a: ' + vehiculoAsig.nombre
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 14px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                if (
                                  window.confirm('¿Desasignar ERA del móvil?')
                                ) {
                                  props.onDesasignarERA(
                                    vehiculoAsig.id,
                                    era.id
                                  );
                                }
                              },
                            },
                            '↩️ Desasignar'
                          )
                        )
                      : React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'select',
                            {
                              value: asignarVeh,
                              onChange: function (e) {
                                setAsignarVeh(e.target.value);
                              },
                              style: Object.assign({}, styles.input, {
                                flex: 1,
                              }),
                            },
                            React.createElement(
                              'option',
                              { value: '' },
                              'Seleccionar móvil...'
                            ),
                            props.vehiculos.map(function (v) {
                              return React.createElement(
                                'option',
                                { key: v.id, value: v.id },
                                v.nombre
                              );
                            })
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 16px',
                                background: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function () {
                                if (!asignarVeh) {
                                  alert('Seleccioná un móvil');
                                  return;
                                }
                                props.onAsignarERA(asignarVeh, era.id);
                                setAsignarVeh('');
                              },
                            },
                            '➕ Asignar'
                          )
                        )
                  )
                )
            );
          })
        )
  );
}

// ============================================
// PERSONAL - CON LICENCIAS DE CONDUCIR
// ============================================
function Personal(props) {
  var formInicial = {
    nombre: '',
    apellido: '',
    legajo: '',
    rol: 'bombero',
    telefono: '',
    email: '',
    fechaIngreso: '',
    estado: 'activo',
    licencia: {
      numero: '',
      categoria: '',
      vencimiento: '',
      observaciones: '',
    },
  };
  var formState = useState(formInicial);
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var busquedaState = useState('');
  var busqueda = busquedaState[0];
  var setBusqueda = busquedaState[1];
  var expandidoState = useState(null);
  var expandido = expandidoState[0];
  var setExpandido = expandidoState[1];

  var roles = [
    'bombero',
    'cabo',
    'sargento',
    'teniente',
    'capitan',
    'administrativo',
    'voluntario',
  ];
  var categoriasLicencia = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'A1',
    'B1',
    'C1',
    'D1',
    'E1',
  ];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 60) return 'proximo';
    return 'ok';
  };

  var personalFiltrado = props.personal.filter(function (p) {
    return (
      !busqueda ||
      (p.nombre + ' ' + p.apellido + ' ' + p.legajo)
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    );
  });

  var iniciarEdicion = function (p) {
    setEditando(p.id);
    setFormEdit({
      nombre: p.nombre || '',
      apellido: p.apellido || '',
      legajo: p.legajo || '',
      rol: p.rol || 'bombero',
      telefono: p.telefono || '',
      email: p.email || '',
      fechaIngreso: p.fechaIngreso || '',
      estado: p.estado || 'activo',
      licencia: p.licencia || {
        numero: '',
        categoria: '',
        vencimiento: '',
        observaciones: '',
      },
    });
  };

  var guardarEdicion = async function (pId) {
    await props.onActualizar(pId, formEdit);
    setEditando(null);
    alert('✅ Personal actualizado correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    var id = await props.onAgregar(form);
    if (id) {
      setForm(formInicial);
      setMostrarForm(false);
      alert('✅ Personal agregado');
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '👥 Personal'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Personal'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0fdf4',
            border: '2px solid #bbf7d0',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#15803d' }) },
          '➕ Nuevo Personal'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Nombre *'),
              React.createElement('input', {
                type: 'text',
                value: form.nombre,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { nombre: e.target.value }));
                },
                style: styles.input,
                required: true,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Apellido'),
              React.createElement('input', {
                type: 'text',
                value: form.apellido,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { apellido: e.target.value })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Legajo'),
              React.createElement('input', {
                type: 'text',
                value: form.legajo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { legajo: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Rol'),
              React.createElement(
                'select',
                {
                  value: form.rol,
                  onChange: function (e) {
                    setForm(Object.assign({}, form, { rol: e.target.value }));
                  },
                  style: styles.input,
                },
                roles.map(function (r) {
                  return React.createElement('option', { key: r, value: r }, r);
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Teléfono'),
              React.createElement('input', {
                type: 'text',
                value: form.telefono,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { telefono: e.target.value })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Email'),
              React.createElement('input', {
                type: 'email',
                value: form.email,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { email: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Fecha Ingreso'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.fechaIngreso,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { fechaIngreso: e.target.value })
                  );
                },
                style: styles.input,
              })
            )
          ),
          React.createElement(
            'div',
            {
              style: {
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'h4',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#1e40af',
                  marginBottom: '12px',
                },
              },
              '🪪 Licencia de Conducir'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                },
              },
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'N° Licencia'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.licencia.numero,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        licencia: Object.assign({}, form.licencia, {
                          numero: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Número de licencia',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Categoría'
                ),
                React.createElement(
                  'select',
                  {
                    value: form.licencia.categoria,
                    onChange: function (e) {
                      setForm(
                        Object.assign({}, form, {
                          licencia: Object.assign({}, form.licencia, {
                            categoria: e.target.value,
                          }),
                        })
                      );
                    },
                    style: styles.input,
                  },
                  React.createElement('option', { value: '' }, 'Sin licencia'),
                  categoriasLicencia.map(function (c) {
                    return React.createElement(
                      'option',
                      { key: c, value: c },
                      'Categoría ' + c
                    );
                  })
                )
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Vencimiento'
                ),
                React.createElement('input', {
                  type: 'date',
                  value: form.licencia.vencimiento,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        licencia: Object.assign({}, form.licencia, {
                          vencimiento: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                })
              ),
              React.createElement(
                'div',
                { style: { gridColumn: 'span 3' } },
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Observaciones'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.licencia.observaciones,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        licencia: Object.assign({}, form.licencia, {
                          observaciones: e.target.value,
                        }),
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Restricciones, observaciones...',
                })
              )
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Agregar Personal'
          )
        )
      ),

    React.createElement('input', {
      type: 'text',
      placeholder: '🔍 Buscar personal...',
      value: busqueda,
      onChange: function (e) {
        setBusqueda(e.target.value);
      },
      style: Object.assign({}, styles.input, { marginBottom: '20px' }),
    }),

    personalFiltrado.length === 0
      ? React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, {
              textAlign: 'center',
              padding: '60px',
            }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '64px', marginBottom: '16px' } },
            '👥'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay personal registrado'
          )
        )
      : React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          personalFiltrado.map(function (p) {
            var isEditando = editando === p.id;
            var isExpandido = expandido === p.id;
            var rolColores = {
              bombero: '#3b82f6',
              cabo: '#8b5cf6',
              sargento: '#f59e0b',
              teniente: '#ef4444',
              capitan: '#dc2626',
              administrativo: '#10b981',
              voluntario: '#6b7280',
            };
            var licencia = p.licencia || {};
            var vencLic = verificarVencimiento(licencia.vencimiento);
            var licAlerta = vencLic === 'vencido' || vencLic === 'proximo';

            return React.createElement(
              'div',
              {
                key: p.id,
                style: Object.assign({}, styles.card, {
                  marginBottom: '0',
                  border:
                    '2px solid ' +
                    (licAlerta
                      ? vencLic === 'vencido'
                        ? '#ef4444'
                        : '#f59e0b'
                      : p.estado === 'activo'
                      ? '#bbf7d0'
                      : '#fecaca'),
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  },
                  onClick: function () {
                    setExpandido(isExpandido ? null : p.id);
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        color: 'white',
                        fontWeight: 'bold',
                      },
                    },
                    (p.nombre || '?')[0].toUpperCase()
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '2px',
                        },
                      },
                      p.nombre + ' ' + (p.apellido || '')
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        },
                      },
                      p.legajo &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          'Leg: ' + p.legajo
                        ),
                      licencia.categoria &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background:
                                vencLic === 'vencido'
                                  ? '#fee2e2'
                                  : vencLic === 'proximo'
                                  ? '#fef3c7'
                                  : '#dbeafe',
                              color:
                                vencLic === 'vencido'
                                  ? '#dc2626'
                                  : vencLic === 'proximo'
                                  ? '#92400e'
                                  : '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🪪 Cat. ' +
                            licencia.categoria +
                            (vencLic === 'vencido'
                              ? ' ⚠️ VENCIDA'
                              : vencLic === 'proximo'
                              ? ' ⚠️ PRÓXIMA'
                              : ' ✓')
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: rolColores[p.rol] || '#6b7280',
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      },
                    },
                    p.rol || 'bombero'
                  ),
                  React.createElement(
                    'span',
                    {
                      style:
                        p.estado === 'activo'
                          ? styles.badgeOk
                          : styles.badgeWarn,
                    },
                    p.estado === 'activo' ? '✓ ACTIVO' : '⏸️ INACTIVO'
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '18px', color: '#6b7280' } },
                    isExpandido ? '▲' : '▼'
                  )
                )
              ),

              isExpandido &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '20px',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '20px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                      },
                    },
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          iniciarEdicion(p);
                        },
                      },
                      '✏️ Editar'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background:
                            p.estado === 'activo' ? '#f59e0b' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          props.onActualizar(p.id, {
                            estado:
                              p.estado === 'activo' ? 'inactivo' : 'activo',
                          });
                        },
                      },
                      p.estado === 'activo' ? '⏸️ Desactivar' : '▶️ Activar'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 14px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          if (window.confirm('¿Eliminar a ' + p.nombre + '?')) {
                            props.onEliminar(p.id);
                          }
                        },
                      },
                      '🗑️ Eliminar'
                    )
                  ),

                  isEditando &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f0f9ff',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '2px solid #0ea5e9',
                          marginBottom: '16px',
                        },
                      },
                      React.createElement(
                        'h4',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#0369a1',
                            marginBottom: '16px',
                          },
                        },
                        '✏️ Editando: ' + p.nombre + ' ' + (p.apellido || '')
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Nombre'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.nombre || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  nombre: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Apellido'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.apellido || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  apellido: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Legajo'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.legajo || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  legajo: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Rol'
                          ),
                          React.createElement(
                            'select',
                            {
                              value: formEdit.rol || 'bombero',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    rol: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            },
                            roles.map(function (r) {
                              return React.createElement(
                                'option',
                                { key: r, value: r },
                                r
                              );
                            })
                          )
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Teléfono'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: formEdit.telefono || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  telefono: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Email'
                          ),
                          React.createElement('input', {
                            type: 'email',
                            value: formEdit.email || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  email: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Fecha Ingreso'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: formEdit.fechaIngreso || '',
                            onChange: function (e) {
                              setFormEdit(
                                Object.assign({}, formEdit, {
                                  fechaIngreso: e.target.value,
                                })
                              );
                            },
                            style: styles.input,
                          })
                        ),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'label',
                            { style: styles.label },
                            'Estado'
                          ),
                          React.createElement(
                            'select',
                            {
                              value: formEdit.estado || 'activo',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    estado: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            },
                            React.createElement(
                              'option',
                              { value: 'activo' },
                              'Activo'
                            ),
                            React.createElement(
                              'option',
                              { value: 'inactivo' },
                              'Inactivo'
                            ),
                            React.createElement(
                              'option',
                              { value: 'licencia' },
                              'De Licencia'
                            )
                          )
                        )
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            borderRadius: '10px',
                            padding: '14px',
                            marginBottom: '12px',
                          },
                        },
                        React.createElement(
                          'h5',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#1e40af',
                              marginBottom: '10px',
                            },
                          },
                          '🪪 Licencia de Conducir'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '10px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'N° Licencia'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (formEdit.licencia || {}).numero || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    licencia: Object.assign(
                                      {},
                                      formEdit.licencia || {},
                                      { numero: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Categoría'
                            ),
                            React.createElement(
                              'select',
                              {
                                value:
                                  (formEdit.licencia || {}).categoria || '',
                                onChange: function (e) {
                                  setFormEdit(
                                    Object.assign({}, formEdit, {
                                      licencia: Object.assign(
                                        {},
                                        formEdit.licencia || {},
                                        { categoria: e.target.value }
                                      ),
                                    })
                                  );
                                },
                                style: styles.input,
                              },
                              React.createElement(
                                'option',
                                { value: '' },
                                'Sin licencia'
                              ),
                              categoriasLicencia.map(function (c) {
                                return React.createElement(
                                  'option',
                                  { key: c, value: c },
                                  'Categoría ' + c
                                );
                              })
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Vencimiento'
                            ),
                            React.createElement('input', {
                              type: 'date',
                              value:
                                (formEdit.licencia || {}).vencimiento || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    licencia: Object.assign(
                                      {},
                                      formEdit.licencia || {},
                                      { vencimiento: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 3' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Observaciones'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value:
                                (formEdit.licencia || {}).observaciones || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    licencia: Object.assign(
                                      {},
                                      formEdit.licencia || {},
                                      { observaciones: e.target.value }
                                    ),
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          )
                        )
                      ),
                      React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '10px' } },
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              guardarEdicion(p.id);
                            },
                          },
                          '💾 Guardar'
                        ),
                        React.createElement(
                          'button',
                          {
                            style: {
                              flex: 1,
                              padding: '10px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            },
                            onClick: function () {
                              setEditando(null);
                            },
                          },
                          '✖ Cancelar'
                        )
                      )
                    ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                      },
                    },
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f9fafb',
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#374151',
                            marginBottom: '10px',
                          },
                        },
                        '👤 Datos Personales'
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          },
                        },
                        p.telefono &&
                          React.createElement(
                            'p',
                            { style: { fontSize: '13px' } },
                            '📞 ' + p.telefono
                          ),
                        p.email &&
                          React.createElement(
                            'p',
                            { style: { fontSize: '13px' } },
                            '✉️ ' + p.email
                          ),
                        p.fechaIngreso &&
                          React.createElement(
                            'p',
                            { style: { fontSize: '13px' } },
                            '📅 Ingreso: ' + p.fechaIngreso
                          )
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          background:
                            vencLic === 'vencido'
                              ? '#fee2e2'
                              : vencLic === 'proximo'
                              ? '#fef3c7'
                              : '#dbeafe',
                          padding: '16px',
                          borderRadius: '10px',
                          border:
                            '1px solid ' +
                            (vencLic === 'vencido'
                              ? '#fecaca'
                              : vencLic === 'proximo'
                              ? '#fde68a'
                              : '#93c5fd'),
                        },
                      },
                      React.createElement(
                        'h5',
                        {
                          style: {
                            fontWeight: 'bold',
                            color:
                              vencLic === 'vencido'
                                ? '#dc2626'
                                : vencLic === 'proximo'
                                ? '#92400e'
                                : '#1e40af',
                            marginBottom: '10px',
                          },
                        },
                        '🪪 Licencia de Conducir'
                      ),
                      licencia.categoria
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              },
                            },
                            React.createElement(
                              'p',
                              {
                                style: { fontSize: '14px', fontWeight: '700' },
                              },
                              'Categoría ' + licencia.categoria
                            ),
                            licencia.numero &&
                              React.createElement(
                                'p',
                                { style: { fontSize: '13px' } },
                                '🔢 N°: ' + licencia.numero
                              ),
                            licencia.vencimiento &&
                              React.createElement(
                                'p',
                                {
                                  style: {
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color:
                                      vencLic === 'vencido'
                                        ? '#dc2626'
                                        : vencLic === 'proximo'
                                        ? '#92400e'
                                        : '#15803d',
                                  },
                                },
                                '📅 Vence: ' +
                                  licencia.vencimiento +
                                  (vencLic === 'vencido'
                                    ? ' ⚠️ VENCIDA'
                                    : vencLic === 'proximo'
                                    ? ' ⚠️ PRÓXIMA'
                                    : ' ✓')
                              ),
                            licencia.observaciones &&
                              React.createElement(
                                'p',
                                {
                                  style: {
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    fontStyle: 'italic',
                                  },
                                },
                                '💬 ' + licencia.observaciones
                              )
                          )
                        : React.createElement(
                            'p',
                            { style: { fontSize: '13px', color: '#9ca3af' } },
                            'Sin licencia registrada'
                          )
                    )
                  )
                )
            );
          })
        )
  );
}

// ============================================
// BITÁCORA - POR ERA, HERRAMIENTA Y MÓVIL
// ============================================
function Bitacora(props) {
  var formInicial = {
    titulo: '',
    descripcion: '',
    tipo: 'incidente',
    entidadTipo: 'vehiculo',
    entidadId: '',
    fecha: new Date().toISOString().split('T')[0],
  };
  var formState = useState(formInicial);
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var expandidoState = useState(null);
  var expandido = expandidoState[0];
  var setExpandido = expandidoState[1];
  var filtroEntidadState = useState('');
  var filtroEntidad = filtroEntidadState[0];
  var setFiltroEntidad = filtroEntidadState[1];
  var filtroTipoEntState = useState('');
  var filtroTipoEnt = filtroTipoEntState[0];
  var setFiltroTipoEnt = filtroTipoEntState[1];

  var tipos = [
    'incidente',
    'mantenimiento',
    'capacitacion',
    'inspeccion',
    'reparacion',
    'otro',
  ];
  var tipoColores = {
    incidente: '#ef4444',
    mantenimiento: '#f59e0b',
    capacitacion: '#3b82f6',
    inspeccion: '#8b5cf6',
    reparacion: '#10b981',
    otro: '#6b7280',
  };
  var tipoIconos = {
    incidente: '🚨',
    mantenimiento: '🔧',
    capacitacion: '📚',
    inspeccion: '🔍',
    reparacion: '🛠️',
    otro: '📝',
  };

  var getEntidadesDisponibles = function (tipoEnt) {
    if (tipoEnt === 'vehiculo')
      return props.vehiculos.map(function (v) {
        return { id: v.id, nombre: v.nombre };
      });
    if (tipoEnt === 'era')
      return props.eras.map(function (e) {
        return {
          id: e.id,
          nombre: e.marca + ' ' + e.modelo + ' [' + e.serial + ']',
        };
      });
    if (tipoEnt === 'equipo')
      return props.equipos.map(function (e) {
        return {
          id: e.id,
          nombre:
            e.nombre + (e.codigoInterno ? ' [' + e.codigoInterno + ']' : ''),
        };
      });
    if (tipoEnt === 'herramienta')
      return props.inventario.map(function (i) {
        return { id: i.id, nombre: i.nombre + ' [' + i.categoria + ']' };
      });
    return [];
  };

  var getNombreEntidad = function (tipoEnt, entidadId) {
    var lista = getEntidadesDisponibles(tipoEnt);
    var found = lista.find(function (e) {
      return e.id === entidadId;
    });
    return found ? found.nombre : 'N/D';
  };

  var bitacoraFiltrada = props.bitacora.filter(function (b) {
    var matchTipo = !filtroTipoEnt || b.entidadTipo === filtroTipoEnt;
    var matchEntidad = !filtroEntidad || b.entidadId === filtroEntidad;
    return matchTipo && matchEntidad;
  });

  var iniciarEdicion = function (b) {
    setEditando(b.id);
    setFormEdit({
      titulo: b.titulo || '',
      descripcion: b.descripcion || '',
      tipo: b.tipo || 'incidente',
      entidadTipo: b.entidadTipo || 'vehiculo',
      entidadId: b.entidadId || '',
      fecha: b.fecha || '',
    });
  };

  var guardarEdicion = async function (bId) {
    await props.onActualizar(bId, formEdit);
    setEditando(null);
    alert('✅ Registro actualizado correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }
    if (!form.entidadId) {
      alert('Seleccioná una entidad');
      return;
    }
    var nombreEntidad = getNombreEntidad(form.entidadTipo, form.entidadId);
    var id = await props.onAgregar(
      Object.assign({}, form, { entidadNombre: nombreEntidad })
    );
    if (id) {
      setForm(formInicial);
      setMostrarForm(false);
      alert('✅ Registro agregado');
    }
  };

  var entidadIconos = {
    vehiculo: '🚛',
    era: '🎽',
    equipo: '🧯',
    herramienta: '🔧',
  };
  var entidadLabels = {
    vehiculo: 'Móvil',
    era: 'ERA',
    equipo: 'Equipo',
    herramienta: 'Herramienta/Item',
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '📝 Bitácora'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Registro'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#fafafa',
            border: '2px solid #e5e7eb',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: styles.cardTitle },
          '➕ Nuevo Registro de Bitácora'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              { style: { gridColumn: 'span 2' } },
              React.createElement('label', { style: styles.label }, 'Título *'),
              React.createElement('input', {
                type: 'text',
                value: form.titulo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { titulo: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Título del registro',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Fecha'),
              React.createElement('input', {
                type: 'date',
                value: form.fecha,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { fecha: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Tipo de Registro'
              ),
              React.createElement(
                'select',
                {
                  value: form.tipo,
                  onChange: function (e) {
                    setForm(Object.assign({}, form, { tipo: e.target.value }));
                  },
                  style: styles.input,
                },
                tipos.map(function (t) {
                  return React.createElement(
                    'option',
                    { key: t, value: t },
                    tipoIconos[t] + ' ' + t.charAt(0).toUpperCase() + t.slice(1)
                  );
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Tipo de Entidad'
              ),
              React.createElement(
                'select',
                {
                  value: form.entidadTipo,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        entidadTipo: e.target.value,
                        entidadId: '',
                      })
                    );
                  },
                  style: styles.input,
                },
                React.createElement(
                  'option',
                  { value: 'vehiculo' },
                  '🚛 Móvil'
                ),
                React.createElement('option', { value: 'era' }, '🎽 ERA'),
                React.createElement('option', { value: 'equipo' }, '🧯 Equipo'),
                React.createElement(
                  'option',
                  { value: 'herramienta' },
                  '🔧 Herramienta/Item'
                )
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                entidadLabels[form.entidadTipo] + ' *'
              ),
              React.createElement(
                'select',
                {
                  value: form.entidadId,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { entidadId: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: '' }, 'Seleccionar...'),
                getEntidadesDisponibles(form.entidadTipo).map(function (ent) {
                  return React.createElement(
                    'option',
                    { key: ent.id, value: ent.id },
                    ent.nombre
                  );
                })
              )
            ),
            React.createElement(
              'div',
              { style: { gridColumn: 'span 3' } },
              React.createElement(
                'label',
                { style: styles.label },
                'Descripción'
              ),
              React.createElement('textarea', {
                value: form.descripcion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { descripcion: e.target.value })
                  );
                },
                style: Object.assign({}, styles.input, {
                  minHeight: '100px',
                  resize: 'vertical',
                }),
                placeholder: 'Descripción detallada del registro...',
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Guardar Registro'
          )
        )
      ),

    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        },
      },
      React.createElement(
        'select',
        {
          value: filtroTipoEnt,
          onChange: function (e) {
            setFiltroTipoEnt(e.target.value);
            setFiltroEntidad('');
          },
          style: Object.assign({}, styles.input, { width: '180px' }),
        },
        React.createElement('option', { value: '' }, 'Todas las entidades'),
        React.createElement('option', { value: 'vehiculo' }, '🚛 Móviles'),
        React.createElement('option', { value: 'era' }, '🎽 ERAs'),
        React.createElement('option', { value: 'equipo' }, '🧯 Equipos'),
        React.createElement(
          'option',
          { value: 'herramienta' },
          '🔧 Herramientas'
        )
      ),
      filtroTipoEnt &&
        React.createElement(
          'select',
          {
            value: filtroEntidad,
            onChange: function (e) {
              setFiltroEntidad(e.target.value);
            },
            style: Object.assign({}, styles.input, {
              flex: 1,
              minWidth: '200px',
            }),
          },
          React.createElement(
            'option',
            { value: '' },
            'Todos los ' + (entidadLabels[filtroTipoEnt] || '') + 's'
          ),
          getEntidadesDisponibles(filtroTipoEnt).map(function (ent) {
            return React.createElement(
              'option',
              { key: ent.id, value: ent.id },
              ent.nombre
            );
          })
        )
    ),

    bitacoraFiltrada.length === 0
      ? React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, {
              textAlign: 'center',
              padding: '60px',
            }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '64px', marginBottom: '16px' } },
            '📝'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay registros en la bitácora'
          )
        )
      : React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          bitacoraFiltrada.map(function (b) {
            var isEditando = editando === b.id;
            var isExpandido = expandido === b.id;
            var nombreEntidad =
              b.entidadNombre || getNombreEntidad(b.entidadTipo, b.entidadId);

            return React.createElement(
              'div',
              {
                key: b.id,
                style: Object.assign({}, styles.card, {
                  borderLeft: '5px solid ' + (tipoColores[b.tipo] || '#e5e7eb'),
                  marginBottom: '0',
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '10px',
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      flex: 1,
                      cursor: 'pointer',
                    },
                    onClick: function () {
                      setExpandido(isExpandido ? null : b.id);
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '44px',
                        height: '44px',
                        background: tipoColores[b.tipo] || '#6b7280',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0,
                      },
                    },
                    tipoIconos[b.tipo] || '📝'
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '4px',
                        },
                      },
                      b.titulo
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          style: {
                            background:
                              (tipoColores[b.tipo] || '#6b7280') + '20',
                            color: tipoColores[b.tipo] || '#374151',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                          },
                        },
                        tipoIconos[b.tipo] +
                          ' ' +
                          (b.tipo || '').charAt(0).toUpperCase() +
                          (b.tipo || '').slice(1)
                      ),
                      b.entidadTipo &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              background: '#f3f4f6',
                              color: '#374151',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            },
                          },
                          entidadIconos[b.entidadTipo] + ' ' + nombreEntidad
                        ),
                      b.fecha &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          '📅 ' + b.fecha
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { style: { display: 'flex', gap: '8px' } },
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '7px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        iniciarEdicion(b);
                      },
                    },
                    '✏️ Editar'
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '7px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        if (window.confirm('¿Eliminar este registro?')) {
                          props.onEliminar(b.id);
                        }
                      },
                    },
                    '🗑️'
                  )
                )
              ),

              isExpandido &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '16px',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '16px',
                    },
                  },
                  isEditando
                    ? React.createElement(
                        'div',
                        {
                          style: {
                            background: '#f9fafb',
                            padding: '16px',
                            borderRadius: '10px',
                          },
                        },
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                              marginBottom: '12px',
                            },
                          },
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 2' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Título'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: formEdit.titulo || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    titulo: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Fecha'
                            ),
                            React.createElement('input', {
                              type: 'date',
                              value: formEdit.fecha || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    fecha: e.target.value,
                                  })
                                );
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Tipo'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: formEdit.tipo || 'incidente',
                                onChange: function (e) {
                                  setFormEdit(
                                    Object.assign({}, formEdit, {
                                      tipo: e.target.value,
                                    })
                                  );
                                },
                                style: styles.input,
                              },
                              tipos.map(function (t) {
                                return React.createElement(
                                  'option',
                                  { key: t, value: t },
                                  tipoIconos[t] +
                                    ' ' +
                                    t.charAt(0).toUpperCase() +
                                    t.slice(1)
                                );
                              })
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Tipo Entidad'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: formEdit.entidadTipo || 'vehiculo',
                                onChange: function (e) {
                                  setFormEdit(
                                    Object.assign({}, formEdit, {
                                      entidadTipo: e.target.value,
                                      entidadId: '',
                                    })
                                  );
                                },
                                style: styles.input,
                              },
                              React.createElement(
                                'option',
                                { value: 'vehiculo' },
                                '🚛 Móvil'
                              ),
                              React.createElement(
                                'option',
                                { value: 'era' },
                                '🎽 ERA'
                              ),
                              React.createElement(
                                'option',
                                { value: 'equipo' },
                                '🧯 Equipo'
                              ),
                              React.createElement(
                                'option',
                                { value: 'herramienta' },
                                '🔧 Herramienta'
                              )
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              entidadLabels[formEdit.entidadTipo || 'vehiculo']
                            ),
                            React.createElement(
                              'select',
                              {
                                value: formEdit.entidadId || '',
                                onChange: function (e) {
                                  setFormEdit(
                                    Object.assign({}, formEdit, {
                                      entidadId: e.target.value,
                                    })
                                  );
                                },
                                style: styles.input,
                              },
                              React.createElement(
                                'option',
                                { value: '' },
                                'Seleccionar...'
                              ),
                              getEntidadesDisponibles(
                                formEdit.entidadTipo || 'vehiculo'
                              ).map(function (ent) {
                                return React.createElement(
                                  'option',
                                  { key: ent.id, value: ent.id },
                                  ent.nombre
                                );
                              })
                            )
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 3' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Descripción'
                            ),
                            React.createElement('textarea', {
                              value: formEdit.descripcion || '',
                              onChange: function (e) {
                                setFormEdit(
                                  Object.assign({}, formEdit, {
                                    descripcion: e.target.value,
                                  })
                                );
                              },
                              style: Object.assign({}, styles.input, {
                                minHeight: '80px',
                                resize: 'vertical',
                              }),
                            })
                          )
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '10px' } },
                          React.createElement(
                            'button',
                            {
                              style: {
                                flex: 1,
                                padding: '10px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                guardarEdicion(b.id);
                              },
                            },
                            '💾 Guardar'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                flex: 1,
                                padding: '10px',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                setEditando(null);
                              },
                            },
                            '✖ Cancelar'
                          )
                        )
                      )
                    : b.descripcion &&
                        React.createElement(
                          'div',
                          {
                            style: {
                              padding: '14px',
                              background: '#f9fafb',
                              borderRadius: '8px',
                              borderLeft:
                                '3px solid ' +
                                (tipoColores[b.tipo] || '#e5e7eb'),
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '14px',
                                color: '#374151',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                              },
                            },
                            b.descripcion
                          )
                        )
                )
            );
          })
        )
  );
}

// ============================================
// RESTO DE FUNCIONES SIN CAMBIOS
// ============================================
function Vehiculos(props) {
  var expandedState = useState({});
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var tabsState = useState({});
  var tabs = tabsState[0];
  var setTabs = tabsState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var formState = useState({
    nombre: '',
    tipo: 'Camion Bomba',
    patente: '',
    año: '',
    estado: 'operativo',
    chasis: '',
    motor: '',
    pruebaHidraulica: '',
    vencimiento: '',
  });
  var form = formState[0];
  var setForm = formState[1];
  var nuevoCompNombreState = useState('');
  var nuevoCompNombre = nuevoCompNombreState[0];
  var setNuevoCompNombre = nuevoCompNombreState[1];
  var nuevoSubNombresState = useState({});
  var nuevoSubNombres = nuevoSubNombresState[0];
  var setNuevoSubNombres = nuevoSubNombresState[1];
  var expandCompState = useState({});
  var expandComp = expandCompState[0];
  var setExpandComp = expandCompState[1];
  var itemSelSubcompState = useState({});
  var itemSelSubcomp = itemSelSubcompState[0];
  var setItemSelSubcomp = itemSelSubcompState[1];
  var cantSelSubcompState = useState({});
  var cantSelSubcomp = cantSelSubcompState[0];
  var setCantSelSubcomp = cantSelSubcompState[1];
  var itemAsignarState = useState('');
  var itemAsignar = itemAsignarState[0];
  var setItemAsignar = itemAsignarState[1];
  var cantAsignarState = useState(1);
  var cantAsignar = cantAsignarState[0];
  var setCantAsignar = cantAsignarState[1];
  var eraAsignarState = useState('');
  var eraAsignar = eraAsignarState[0];
  var setEraAsignar = eraAsignarState[1];
  var equipoAsignarState = useState('');
  var equipoAsignar = equipoAsignarState[0];
  var setEquipoAsignar = equipoAsignarState[1];

  var setTab = function (vId, tabKey) {
    var t = Object.assign({}, tabs);
    t[vId] = tabKey;
    setTabs(t);
  };

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var getBgColor = function (est) {
    return est === 'vencido'
      ? '#fee2e2'
      : est === 'proximo'
      ? '#fef3c7'
      : '#f9fafb';
  };
  var getBorderColor = function (est) {
    return est === 'vencido'
      ? '#fecaca'
      : est === 'proximo'
      ? '#fde68a'
      : '#e5e7eb';
  };

  var iniciarEdicion = function (v) {
    setEditando(v.id);
    setFormEdit({
      nombre: v.nombre || '',
      tipo: v.tipo || '',
      patente: v.patente || '',
      año: v.año || '',
      chasis: v.chasis || '',
      motor: v.motor || '',
      pruebaHidraulica: v.pruebaHidraulica || '',
      vencimiento: v.vencimiento || '',
    });
  };

  var guardarEdicion = async function (vId) {
    await props.onActualizar(vId, formEdit);
    setEditando(null);
    alert('✅ Móvil actualizado correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    await props.onAgregar(form);
    setForm({
      nombre: '',
      tipo: 'Camion Bomba',
      patente: '',
      año: '',
      estado: 'operativo',
      chasis: '',
      motor: '',
      pruebaHidraulica: '',
      vencimiento: '',
    });
    setMostrarForm(false);
  };

  var tabsConfig = [
    { key: 'info', label: '📋 Info' },
    { key: 'bateria', label: '🔋 Batería' },
    { key: 'fluidos', label: '🛢️ Fluidos' },
    { key: 'compartimientos', label: '🗄️ Compartimientos' },
    { key: 'items', label: '📦 Items' },
    { key: 'eras', label: '🎽 ERAs' },
    { key: 'equipos', label: '🧯 Equipos' },
    { key: 'vtv', label: '🚗 VTV' },
  ];

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '🚛 Móviles'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Móvil'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0f9ff',
            border: '2px solid #0ea5e9',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#0369a1' }) },
          '➕ Nuevo Móvil'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Nombre *'),
              React.createElement('input', {
                type: 'text',
                value: form.nombre,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { nombre: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Ej: Autobomba 1',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Tipo'),
              React.createElement(
                'select',
                {
                  value: form.tipo,
                  onChange: function (e) {
                    setForm(Object.assign({}, form, { tipo: e.target.value }));
                  },
                  style: styles.input,
                },
                [
                  'Camion Bomba',
                  'Camion Tanque',
                  'Unidad de Rescate',
                  'Ambulancia',
                  'Vehiculo de Comando',
                  'Otro',
                ].map(function (t) {
                  return React.createElement('option', { key: t, value: t }, t);
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Patente'),
              React.createElement('input', {
                type: 'text',
                value: form.patente,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { patente: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Año'),
              React.createElement('input', {
                type: 'number',
                value: form.año,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { año: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Chasis'),
              React.createElement('input', {
                type: 'text',
                value: form.chasis,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { chasis: e.target.value }));
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Motor'),
              React.createElement('input', {
                type: 'text',
                value: form.motor,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { motor: e.target.value }));
                },
                style: styles.input,
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Agregar Móvil'
          )
        )
      ),

    props.vehiculos.length === 0
      ? React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, {
              textAlign: 'center',
              padding: '60px',
            }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '64px', marginBottom: '16px' } },
            '🚛'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay móviles registrados'
          )
        )
      : React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
          props.vehiculos.map(function (v) {
            var exp = expanded[v.id];
            var tabActual = tabs[v.id] || 'info';
            var bateria = v.bateria || {};
            var compartimientos = v.compartimientos || [];
            var totalItemsComps = compartimientos.reduce(function (acc, c) {
              return (
                acc +
                (c.subcompartimientos || []).reduce(function (a, s) {
                  return a + (s.items || []).length;
                }, 0)
              );
            }, 0);
            var erasAsignadas = (v.erasAsignadas || [])
              .map(function (eId) {
                return props.eras.find(function (e) {
                  return e.id === eId;
                });
              })
              .filter(Boolean);
            var equiposAsignados = (v.equiposAsignados || [])
              .map(function (eId) {
                return props.equipos.find(function (e) {
                  return e.id === eId;
                });
              })
              .filter(Boolean);
            var itemsAsignados = v.itemsAsignados || [];
            var erasDisponibles = props.eras.filter(function (e) {
              return !e.vehiculoAsignado && e.estado === 'activo';
            });
            var equiposDisponibles = props.equipos.filter(function (e) {
              return !e.vehiculoAsignado && e.estado === 'operativo';
            });
            var vtvVenc =
              v.vtv && v.vtv.vencimiento
                ? verificarVencimiento(v.vtv.vencimiento)
                : '';
            var diasVtv =
              v.vtv && v.vtv.vencimiento
                ? Math.ceil(
                    (new Date(v.vtv.vencimiento) - new Date()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;
            var vtvEstado =
              !v.vtv || !v.vtv.vencimiento
                ? 'sin_datos'
                : vtvVenc === 'vencido'
                ? 'vencida'
                : vtvVenc === 'proximo'
                ? 'proxima'
                : 'apta';
            var vtvColor =
              vtvEstado === 'apta'
                ? '#059669'
                : vtvEstado === 'proxima'
                ? '#d97706'
                : vtvEstado === 'vencida'
                ? '#dc2626'
                : '#6b7280';
            var vtvBg =
              vtvEstado === 'apta'
                ? '#d1fae5'
                : vtvEstado === 'proxima'
                ? '#fef3c7'
                : vtvEstado === 'vencida'
                ? '#fee2e2'
                : '#f3f4f6';

            return React.createElement(
              'div',
              {
                key: v.id,
                style: Object.assign({}, styles.card, {
                  border:
                    '2px solid ' +
                    (v.estado === 'operativo' ? '#bbf7d0' : '#fde68a'),
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  },
                  onClick: function () {
                    var e = Object.assign({}, expanded);
                    e[v.id] = !e[v.id];
                    setExpanded(e);
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '56                  px',
                        height: '56px',
                        background:
                          v.estado === 'operativo'
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                      },
                    },
                    '🚛'
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontSize: '18px',
                          fontWeight: 'bold',
                          marginBottom: '4px',
                        },
                      },
                      v.nombre
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap',
                        },
                      },
                      React.createElement(
                        'span',
                        { style: { fontSize: '13px', color: '#6b7280' } },
                        v.tipo
                      ),
                      v.patente &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '13px', color: '#6b7280' } },
                          '🪪 ' + v.patente
                        ),
                      v.año &&
                        React.createElement(
                          'span',
                          { style: { fontSize: '13px', color: '#6b7280' } },
                          '📅 ' + v.año
                        ),
                      erasAsignadas.length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#ede9fe',
                              color: '#7c3aed',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🎽 ' + erasAsignadas.length + ' ERAs'
                        ),
                      equiposAsignados.length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#fff7ed',
                              color: '#c2410c',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🧯 ' + equiposAsignados.length + ' Equipos'
                        ),
                      itemsAsignados.length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '📦 ' + itemsAsignados.length + ' Items'
                        ),
                      vtvEstado !== 'sin_datos' &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: vtvBg,
                              color: vtvColor,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🚗 VTV: ' +
                            (vtvEstado === 'apta'
                              ? '✓'
                              : vtvEstado === 'proxima'
                              ? '⚠️'
                              : '❌')
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style:
                        v.estado === 'operativo'
                          ? styles.badgeOk
                          : styles.badgeWarn,
                    },
                    v.estado === 'operativo'
                      ? '✓ OPERATIVO'
                      : '🔧 MANTENIMIENTO'
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '20px', color: '#6b7280' } },
                    exp ? '▲' : '▼'
                  )
                )
              ),

              exp &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '20px',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '20px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                      },
                    },
                    tabsConfig.map(function (tab) {
                      return React.createElement(
                        'button',
                        {
                          key: tab.key,
                          style: {
                            padding: '8px 14px',
                            background:
                              tabActual === tab.key ? '#2563eb' : '#f3f4f6',
                            color: tabActual === tab.key ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: tabActual === tab.key ? '700' : '500',
                          },
                          onClick: function (e) {
                            e.stopPropagation();
                            setTab(v.id, tab.key);
                          },
                        },
                        tab.label
                      );
                    })
                  ),

                  tabActual === 'info' &&
                    React.createElement(
                      'div',
                      null,
                      editando === v.id
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                background: '#f0f9ff',
                                padding: '20px',
                                borderRadius: '12px',
                                border: '2px solid #0ea5e9',
                                marginBottom: '16px',
                              },
                            },
                            React.createElement(
                              'h4',
                              {
                                style: {
                                  fontWeight: 'bold',
                                  color: '#0369a1',
                                  marginBottom: '16px',
                                },
                              },
                              '✏️ Editando: ' + v.nombre
                            ),
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '12px',
                                  marginBottom: '12px',
                                },
                              },
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Nombre'
                                ),
                                React.createElement('input', {
                                  type: 'text',
                                  value: formEdit.nombre || '',
                                  onChange: function (e) {
                                    setFormEdit(
                                      Object.assign({}, formEdit, {
                                        nombre: e.target.value,
                                      })
                                    );
                                  },
                                  style: styles.input,
                                })
                              ),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Tipo'
                                ),
                                React.createElement(
                                  'select',
                                  {
                                    value: formEdit.tipo || '',
                                    onChange: function (e) {
                                      setFormEdit(
                                        Object.assign({}, formEdit, {
                                          tipo: e.target.value,
                                        })
                                      );
                                    },
                                    style: styles.input,
                                  },
                                  [
                                    'Camion Bomba',
                                    'Camion Tanque',
                                    'Unidad de Rescate',
                                    'Ambulancia',
                                    'Vehiculo de Comando',
                                    'Otro',
                                  ].map(function (t) {
                                    return React.createElement(
                                      'option',
                                      { key: t, value: t },
                                      t
                                    );
                                  })
                                )
                              ),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Patente'
                                ),
                                React.createElement('input', {
                                  type: 'text',
                                  value: formEdit.patente || '',
                                  onChange: function (e) {
                                    setFormEdit(
                                      Object.assign({}, formEdit, {
                                        patente: e.target.value,
                                      })
                                    );
                                  },
                                  style: styles.input,
                                })
                              ),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Año'
                                ),
                                React.createElement('input', {
                                  type: 'number',
                                  value: formEdit.año || '',
                                  onChange: function (e) {
                                    setFormEdit(
                                      Object.assign({}, formEdit, {
                                        año: e.target.value,
                                      })
                                    );
                                  },
                                  style: styles.input,
                                })
                              ),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Chasis'
                                ),
                                React.createElement('input', {
                                  type: 'text',
                                  value: formEdit.chasis || '',
                                  onChange: function (e) {
                                    setFormEdit(
                                      Object.assign({}, formEdit, {
                                        chasis: e.target.value,
                                      })
                                    );
                                  },
                                  style: styles.input,
                                })
                              ),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'label',
                                  { style: styles.label },
                                  'Motor'
                                ),
                                React.createElement('input', {
                                  type: 'text',
                                  value: formEdit.motor || '',
                                  onChange: function (e) {
                                    setFormEdit(
                                      Object.assign({}, formEdit, {
                                        motor: e.target.value,
                                      })
                                    );
                                  },
                                  style: styles.input,
                                })
                              )
                            ),
                            React.createElement(
                              'div',
                              { style: { display: 'flex', gap: '10px' } },
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    flex: 1,
                                    padding: '10px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                  },
                                  onClick: function (e) {
                                    e.stopPropagation();
                                    guardarEdicion(v.id);
                                  },
                                },
                                '💾 Guardar'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    flex: 1,
                                    padding: '10px',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                  },
                                  onClick: function (e) {
                                    e.stopPropagation();
                                    setEditando(null);
                                  },
                                },
                                '✖ Cancelar'
                              )
                            )
                          )
                        : React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'flex',
                                  gap: '10px',
                                  marginBottom: '16px',
                                  flexWrap: 'wrap',
                                },
                              },
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '8px 14px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                  },
                                  onClick: function (e) {
                                    e.stopPropagation();
                                    iniciarEdicion(v);
                                  },
                                },
                                '✏️ Editar'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '8px 14px',
                                    background:
                                      v.estado === 'operativo'
                                        ? '#f59e0b'
                                        : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                  },
                                  onClick: function (e) {
                                    e.stopPropagation();
                                    props.onActualizar(v.id, {
                                      estado:
                                        v.estado === 'operativo'
                                          ? 'mantenimiento'
                                          : 'operativo',
                                    });
                                  },
                                },
                                v.estado === 'operativo'
                                  ? '🔧 Pasar a Mantenimiento'
                                  : '✅ Marcar Operativo'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '8px 14px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                  },
                                  onClick: function (e) {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        '¿Eliminar móvil ' + v.nombre + '?'
                                      )
                                    ) {
                                      props.onEliminar(v.id);
                                    }
                                  },
                                },
                                '🗑️ Eliminar'
                              )
                            ),
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '12px',
                                },
                              },
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Tipo'
                                ),
                                React.createElement(
                                  'p',
                                  { style: { fontWeight: '600' } },
                                  v.tipo || 'N/D'
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Patente'
                                ),
                                React.createElement(
                                  'p',
                                  { style: { fontWeight: '600' } },
                                  v.patente || 'N/D'
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Año'
                                ),
                                React.createElement(
                                  'p',
                                  { style: { fontWeight: '600' } },
                                  v.año || 'N/D'
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Chasis'
                                ),
                                React.createElement(
                                  'p',
                                  { style: { fontWeight: '600' } },
                                  v.chasis || 'N/D'
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Motor'
                                ),
                                React.createElement(
                                  'p',
                                  { style: { fontWeight: '600' } },
                                  v.motor || 'N/D'
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    background: '#f9fafb',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      marginBottom: '4px',
                                    },
                                  },
                                  'Estado'
                                ),
                                React.createElement(
                                  'span',
                                  {
                                    style:
                                      v.estado === 'operativo'
                                        ? styles.badgeOk
                                        : styles.badgeWarn,
                                  },
                                  v.estado === 'operativo'
                                    ? '✓ OPERATIVO'
                                    : '🔧 MANTENIMIENTO'
                                )
                              )
                            )
                          )
                    ),

                  tabActual === 'equipos' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#fff7ed',
                            padding: '16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            border: '1px solid #fed7aa',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#c2410c',
                              marginBottom: '12px',
                            },
                          },
                          '➕ Asignar Equipo'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'select',
                            {
                              value: equipoAsignar,
                              onChange: function (e) {
                                setEquipoAsignar(e.target.value);
                              },
                              style: Object.assign({}, styles.input, {
                                flex: 1,
                              }),
                            },
                            React.createElement(
                              'option',
                              { value: '' },
                              'Seleccionar equipo disponible...'
                            ),
                            equiposDisponibles.map(function (eq) {
                              return React.createElement(
                                'option',
                                { key: eq.id, value: eq.id },
                                eq.nombre +
                                  (eq.codigoInterno
                                    ? ' [' + eq.codigoInterno + ']'
                                    : '') +
                                  ' - ' +
                                  eq.tipo
                              );
                            })
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 18px',
                                background: '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function (e) {
                                e.stopPropagation();
                                if (!equipoAsignar) {
                                  alert('Seleccioná un equipo');
                                  return;
                                }
                                props.onAsignarEquipo(v.id, equipoAsignar);
                                setEquipoAsignar('');
                              },
                            },
                            '➕ Asignar'
                          )
                        )
                      ),
                      equiposAsignados.length === 0
                        ? React.createElement(
                            'p',
                            {
                              style: {
                                color: '#6b7280',
                                textAlign: 'center',
                                padding: '24px',
                              },
                            },
                            'No hay equipos asignados'
                          )
                        : React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              },
                            },
                            equiposAsignados.map(function (eq) {
                              var venc = verificarVencimiento(eq.vencimiento);
                              return React.createElement(
                                'div',
                                {
                                  key: eq.id,
                                  style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    background:
                                      venc === 'vencido'
                                        ? '#fef2f2'
                                        : '#fff7ed',
                                    borderRadius: '8px',
                                    border:
                                      '1px solid ' +
                                      (venc === 'vencido'
                                        ? '#fecaca'
                                        : '#fed7aa'),
                                  },
                                },
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                    },
                                  },
                                  React.createElement(
                                    'span',
                                    { style: { fontSize: '20px' } },
                                    '🧯'
                                  ),
                                  React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                      'p',
                                      {
                                        style: {
                                          fontWeight: '600',
                                          fontSize: '14px',
                                        },
                                      },
                                      eq.nombre
                                    ),
                                    React.createElement(
                                      'div',
                                      {
                                        style: {
                                          display: 'flex',
                                          gap: '8px',
                                          flexWrap: 'wrap',
                                        },
                                      },
                                      eq.codigoInterno &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              background: '#fef3c7',
                                              color: '#92400e',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                            },
                                          },
                                          '🏷️ ' + eq.codigoInterno
                                        ),
                                      eq.tipo &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              color: '#6b7280',
                                            },
                                          },
                                          eq.tipo
                                        ),
                                      eq.serial &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              color: '#6b7280',
                                            },
                                          },
                                          'S/N: ' + eq.serial
                                        ),
                                      eq.vencimiento &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              color:
                                                venc === 'vencido'
                                                  ? '#dc2626'
                                                  : venc === 'proximo'
                                                  ? '#d97706'
                                                  : '#6b7280',
                                              fontWeight:
                                                venc !== 'ok' ? '600' : '400',
                                            },
                                          },
                                          '📅 ' +
                                            eq.vencimiento +
                                            (venc === 'vencido'
                                              ? ' ⚠️'
                                              : venc === 'proximo'
                                              ? ' ⚠️'
                                              : '')
                                        )
                                    )
                                  )
                                ),
                                React.createElement(
                                  'button',
                                  {
                                    style: {
                                      padding: '6px 10px',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      if (
                                        window.confirm(
                                          '¿Desasignar ' + eq.nombre + '?'
                                        )
                                      ) {
                                        props.onDesasignarEquipo(v.id, eq.id);
                                      }
                                    },
                                  },
                                  '↩️ Quitar'
                                )
                              );
                            })
                          )
                    ),

                  tabActual === 'bateria' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: Object.assign({}, styles.card, {
                            background: '#fffbeb',
                            border: '2px solid #fde68a',
                          }),
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#92400e',
                              marginBottom: '16px',
                            },
                          },
                          '🔋 Estado de Batería'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Estado Batería'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: bateria.estado || 'bueno',
                                onChange: function (e) {
                                  props.onActualizar(v.id, {
                                    bateria: Object.assign({}, bateria, {
                                      estado: e.target.value,
                                    }),
                                  });
                                },
                                style: {
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '8px',
                                  fontSize: '14px',
                                  background:
                                    bateria.estado === 'bueno'
                                      ? '#ecfdf5'
                                      : bateria.estado === 'regular'
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                },
                              },
                              React.createElement(
                                'option',
                                { value: 'bueno' },
                                '✅ Bueno'
                              ),
                              React.createElement(
                                'option',
                                { value: 'regular' },
                                '⚠️ Regular'
                              ),
                              React.createElement(
                                'option',
                                { value: 'malo' },
                                '❌ Malo'
                              )
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Voltaje (V)'
                            ),
                            React.createElement('input', {
                              type: 'number',
                              value: bateria.voltaje || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  bateria: Object.assign({}, bateria, {
                                    voltaje: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                              placeholder: 'Ej: 12.6',
                              step: '0.1',
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Último Reemplazo'
                            ),
                            React.createElement('input', {
                              type: 'date',
                              value: bateria.ultimoReemplazo || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  bateria: Object.assign({}, bateria, {
                                    ultimoReemplazo: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 3' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Observaciones'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: bateria.observaciones || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  bateria: Object.assign({}, bateria, {
                                    observaciones: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                              placeholder: 'Observaciones de la batería...',
                            })
                          )
                        )
                      )
                    ),

                  tabActual === 'fluidos' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: Object.assign({}, styles.card, {
                            background: '#fffbeb',
                            border: '2px solid #fde68a',
                          }),
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#92400e',
                              marginBottom: '16px',
                            },
                          },
                          '🛢️ Control de Fluidos'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '12px',
                            },
                          },
                          [
                            'aceite',
                            'refrigerante',
                            'combustible',
                            'liquidoFrenos',
                          ].map(function (fluido) {
                            var nombresAmigables = {
                              aceite: '🛢️ Aceite de Motor',
                              refrigerante: '🌡️ Refrigerante',
                              combustible: '⛽ Combustible',
                              liquidoFrenos: '🔴 Líquido de Frenos',
                            };
                            var val = (v.fluidos || {})[fluido] || {};
                            return React.createElement(
                              'div',
                              {
                                key: fluido,
                                style: {
                                  background: 'white',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e5e7eb',
                                },
                              },
                              React.createElement(
                                'h5',
                                {
                                  style: {
                                    fontWeight: 'bold',
                                    marginBottom: '10px',
                                    color: '#374151',
                                  },
                                },
                                nombresAmigables[fluido]
                              ),
                              React.createElement(
                                'div',
                                {
                                  style: {
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '8px',
                                  },
                                },
                                ['ok', 'bajo', 'critico'].map(function (est) {
                                  var colores = {
                                    ok: '#10b981',
                                    bajo: '#f59e0b',
                                    critico: '#ef4444',
                                  };
                                  var labels = {
                                    ok: '✓ OK',
                                    bajo: '⚠️ Bajo',
                                    critico: '❌ Crítico',
                                  };
                                  return React.createElement(
                                    'button',
                                    {
                                      key: est,
                                      style: {
                                        flex: 1,
                                        padding: '6px',
                                        background:
                                          val.estado === est
                                            ? colores[est]
                                            : '#f3f4f6',
                                        color:
                                          val.estado === est
                                            ? 'white'
                                            : '#374151',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        var f = Object.assign(
                                          {},
                                          v.fluidos || {}
                                        );
                                        f[fluido] = Object.assign({}, val, {
                                          estado: est,
                                        });
                                        props.onActualizar(v.id, {
                                          fluidos: f,
                                        });
                                      },
                                    },
                                    labels[est]
                                  );
                                })
                              ),
                              React.createElement('input', {
                                type: 'text',
                                placeholder: 'Observaciones...',
                                value: val.observaciones || '',
                                onChange: function (e) {
                                  var f = Object.assign({}, v.fluidos || {});
                                  f[fluido] = Object.assign({}, val, {
                                    observaciones: e.target.value,
                                  });
                                  props.onActualizar(v.id, { fluidos: f });
                                },
                                style: {
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  boxSizing: 'border-box',
                                },
                              })
                            );
                          })
                        )
                      )
                    ),

                  tabActual === 'compartimientos' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#f0fdf4',
                            padding: '16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            border: '1px solid #bbf7d0',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#15803d',
                              marginBottom: '12px',
                            },
                          },
                          '➕ Nuevo Compartimiento'
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '10px' } },
                          React.createElement('input', {
                            type: 'text',
                            placeholder: 'Nombre del compartimiento...',
                            value: nuevoCompNombre,
                            onChange: function (e) {
                              setNuevoCompNombre(e.target.value);
                            },
                            style: Object.assign({}, styles.input, { flex: 1 }),
                          }),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 18px',
                                background: '#15803d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function (e) {
                                e.stopPropagation();
                                if (!nuevoCompNombre.trim()) {
                                  alert('Ingresá un nombre');
                                  return;
                                }
                                props.onAgregarCompartimiento(
                                  v.id,
                                  nuevoCompNombre.trim()
                                );
                                setNuevoCompNombre('');
                              },
                            },
                            '➕ Agregar'
                          )
                        )
                      ),
                      compartimientos.length === 0
                        ? React.createElement(
                            'p',
                            {
                              style: {
                                color: '#6b7280',
                                textAlign: 'center',
                                padding: '24px',
                              },
                            },
                            'No hay compartimientos'
                          )
                        : React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                              },
                            },
                            compartimientos.map(function (comp) {
                              var compExp = expandComp[v.id + '_' + comp.id];
                              return React.createElement(
                                'div',
                                {
                                  key: comp.id,
                                  style: {
                                    border: '2px solid #d1fae5',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                  },
                                },
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      background: '#ecfdf5',
                                      padding: '14px 16px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var ec = Object.assign({}, expandComp);
                                      ec[v.id + '_' + comp.id] =
                                        !ec[v.id + '_' + comp.id];
                                      setExpandComp(ec);
                                    },
                                  },
                                  React.createElement(
                                    'div',
                                    {
                                      style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                      },
                                    },
                                    React.createElement(
                                      'span',
                                      { style: { fontSize: '20px' } },
                                      '🗄️'
                                    ),
                                    React.createElement(
                                      'div',
                                      null,
                                      React.createElement(
                                        'p',
                                        {
                                          style: {
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            color: '#065f46',
                                          },
                                        },
                                        comp.nombre
                                      ),
                                      React.createElement(
                                        'p',
                                        {
                                          style: {
                                            fontSize: '12px',
                                            color: '#6b7280',
                                          },
                                        },
                                        (comp.subcompartimientos || []).length +
                                          ' subcompartimientos · ' +
                                          (
                                            comp.subcompartimientos || []
                                          ).reduce(function (a, s) {
                                            return a + (s.items || []).length;
                                          }, 0) +
                                          ' items'
                                      )
                                    )
                                  ),
                                  React.createElement(
                                    'div',
                                    {
                                      style: {
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                      },
                                    },
                                    React.createElement(
                                      'button',
                                      {
                                        style: {
                                          padding: '5px 10px',
                                          background: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                        },
                                        onClick: function (e) {
                                          e.stopPropagation();
                                          if (
                                            window.confirm(
                                              '¿Eliminar compartimiento ' +
                                                comp.nombre +
                                                '?'
                                            )
                                          ) {
                                            props.onEliminarCompartimiento(
                                              v.id,
                                              comp.id
                                            );
                                          }
                                        },
                                      },
                                      '🗑️'
                                    ),
                                    React.createElement(
                                      'span',
                                      {
                                        style: {
                                          fontSize: '16px',
                                          color: '#6b7280',
                                        },
                                      },
                                      compExp ? '▲' : '▼'
                                    )
                                  )
                                ),
                                compExp &&
                                  React.createElement(
                                    'div',
                                    {
                                      style: {
                                        padding: '16px',
                                        background: 'white',
                                      },
                                    },
                                    React.createElement(
                                      'div',
                                      {
                                        style: {
                                          display: 'flex',
                                          gap: '8px',
                                          marginBottom: '12px',
                                        },
                                      },
                                      React.createElement('input', {
                                        type: 'text',
                                        placeholder:
                                          'Nombre del subcompartimiento...',
                                        value: nuevoSubNombres[comp.id] || '',
                                        onChange: function (e) {
                                          var u = Object.assign(
                                            {},
                                            nuevoSubNombres
                                          );
                                          u[comp.id] = e.target.value;
                                          setNuevoSubNombres(u);
                                        },
                                        style: Object.assign({}, styles.input, {
                                          flex: 1,
                                          fontSize: '13px',
                                        }),
                                      }),
                                      React.createElement(
                                        'button',
                                        {
                                          style: {
                                            padding: '8px 14px',
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            whiteSpace: 'nowrap',
                                          },
                                          onClick: function (e) {
                                            e.stopPropagation();
                                            var nombre =
                                              nuevoSubNombres[comp.id];
                                            if (!nombre || !nombre.trim()) {
                                              alert('Ingresá un nombre');
                                              return;
                                            }
                                            props.onAgregarSubcompartimiento(
                                              v.id,
                                              comp.id,
                                              nombre.trim()
                                            );
                                            var u = Object.assign(
                                              {},
                                              nuevoSubNombres
                                            );
                                            u[comp.id] = '';
                                            setNuevoSubNombres(u);
                                          },
                                        },
                                        '➕ Agregar Sub'
                                      )
                                    ),
                                    (comp.subcompartimientos || []).length === 0
                                      ? React.createElement(
                                          'p',
                                          {
                                            style: {
                                              color: '#6b7280',
                                              fontSize: '13px',
                                              textAlign: 'center',
                                              padding: '12px',
                                            },
                                          },
                                          'No hay subcompartimientos'
                                        )
                                      : React.createElement(
                                          'div',
                                          {
                                            style: {
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '10px',
                                            },
                                          },
                                          (comp.subcompartimientos || []).map(
                                            function (sub) {
                                              var subKey =
                                                comp.id + '_' + sub.id;
                                              var itemSelKey = subKey + '_item';
                                              var cantSelKey = subKey + '_cant';
                                              return React.createElement(
                                                'div',
                                                {
                                                  key: sub.id,
                                                  style: {
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '10px',
                                                    overflow: 'hidden',
                                                  },
                                                },
                                                React.createElement(
                                                  'div',
                                                  {
                                                    style: {
                                                      background: '#f9fafb',
                                                      padding: '10px 14px',
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      alignItems: 'center',
                                                    },
                                                  },
                                                  React.createElement(
                                                    'div',
                                                    null,
                                                    React.createElement(
                                                      'p',
                                                      {
                                                        style: {
                                                          fontWeight: '600',
                                                          fontSize: '14px',
                                                        },
                                                      },
                                                      '📂 ' + sub.nombre
                                                    ),
                                                    React.createElement(
                                                      'p',
                                                      {
                                                        style: {
                                                          fontSize: '12px',
                                                          color: '#6b7280',
                                                        },
                                                      },
                                                      (sub.items || []).length +
                                                        ' items'
                                                    )
                                                  ),
                                                  React.createElement(
                                                    'button',
                                                    {
                                                      style: {
                                                        padding: '4px 8px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                      },
                                                      onClick: function (e) {
                                                        e.stopPropagation();
                                                        if (
                                                          window.confirm(
                                                            '¿Eliminar subcompartimiento ' +
                                                              sub.nombre +
                                                              '?'
                                                          )
                                                        ) {
                                                          props.onEliminarSubcompartimiento(
                                                            v.id,
                                                            comp.id,
                                                            sub.id
                                                          );
                                                        }
                                                      },
                                                    },
                                                    '🗑️'
                                                  )
                                                ),
                                                React.createElement(
                                                  'div',
                                                  {
                                                    style: { padding: '12px' },
                                                  },
                                                  React.createElement(
                                                    'div',
                                                    {
                                                      style: {
                                                        display: 'flex',
                                                        gap: '8px',
                                                        marginBottom: '10px',
                                                      },
                                                    },
                                                    React.createElement(
                                                      'select',
                                                      {
                                                        value:
                                                          itemSelSubcomp[
                                                            itemSelKey
                                                          ] || '',
                                                        onChange: function (e) {
                                                          var u = Object.assign(
                                                            {},
                                                            itemSelSubcomp
                                                          );
                                                          u[itemSelKey] =
                                                            e.target.value;
                                                          setItemSelSubcomp(u);
                                                        },
                                                        style: Object.assign(
                                                          {},
                                                          styles.input,
                                                          {
                                                            flex: 1,
                                                            fontSize: '12px',
                                                          }
                                                        ),
                                                      },
                                                      React.createElement(
                                                        'option',
                                                        { value: '' },
                                                        'Seleccionar item del inventario...'
                                                      ),
                                                      props.inventario.map(
                                                        function (i) {
                                                          return React.createElement(
                                                            'option',
                                                            {
                                                              key: i.id,
                                                              value: i.id,
                                                            },
                                                            i.nombre +
                                                              ' [' +
                                                              i.categoria +
                                                              '] - Stock: ' +
                                                              (i.stock || 0)
                                                          );
                                                        }
                                                      )
                                                    ),
                                                    React.createElement(
                                                      'input',
                                                      {
                                                        type: 'number',
                                                        value:
                                                          cantSelSubcomp[
                                                            cantSelKey
                                                          ] || 1,
                                                        onChange: function (e) {
                                                          var u = Object.assign(
                                                            {},
                                                            cantSelSubcomp
                                                          );
                                                          u[cantSelKey] =
                                                            parseInt(
                                                              e.target.value
                                                            ) || 1;
                                                          setCantSelSubcomp(u);
                                                        },
                                                        style: {
                                                          width: '70px',
                                                          padding: '8px',
                                                          border:
                                                            '1px solid #d1d5db',
                                                          borderRadius: '6px',
                                                          fontSize: '12px',
                                                        },
                                                        min: '1',
                                                      }
                                                    ),
                                                    React.createElement(
                                                      'button',
                                                      {
                                                        style: {
                                                          padding: '8px 12px',
                                                          background: '#10b981',
                                                          color: 'white',
                                                          border: 'none',
                                                          borderRadius: '6px',
                                                          cursor: 'pointer',
                                                          fontSize: '12px',
                                                          fontWeight: '600',
                                                          whiteSpace: 'nowrap',
                                                        },
                                                        onClick: function (e) {
                                                          e.stopPropagation();
                                                          var itemId =
                                                            itemSelSubcomp[
                                                              itemSelKey
                                                            ];
                                                          var cant =
                                                            cantSelSubcomp[
                                                              cantSelKey
                                                            ] || 1;
                                                          if (!itemId) {
                                                            alert(
                                                              'Seleccioná un item'
                                                            );
                                                            return;
                                                          }
                                                          props.onAgregarItemSubcomp(
                                                            v.id,
                                                            comp.id,
                                                            sub.id,
                                                            itemId,
                                                            cant
                                                          );
                                                          var u1 =
                                                            Object.assign(
                                                              {},
                                                              itemSelSubcomp
                                                            );
                                                          u1[itemSelKey] = '';
                                                          setItemSelSubcomp(u1);
                                                        },
                                                      },
                                                      '➕ Agregar'
                                                    )
                                                  ),
                                                  (sub.items || []).length === 0
                                                    ? React.createElement(
                                                        'p',
                                                        {
                                                          style: {
                                                            color: '#9ca3af',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                          },
                                                        },
                                                        'Sin items'
                                                      )
                                                    : React.createElement(
                                                        'div',
                                                        {
                                                          style: {
                                                            display: 'flex',
                                                            flexDirection:
                                                              'column',
                                                            gap: '6px',
                                                          },
                                                        },
                                                        (sub.items || []).map(
                                                          function (item) {
                                                            return React.createElement(
                                                              'div',
                                                              {
                                                                key: item.itemId,
                                                                style: {
                                                                  display:
                                                                    'flex',
                                                                  justifyContent:
                                                                    'space-between',
                                                                  alignItems:
                                                                    'center',
                                                                  padding:
                                                                    '8px 10px',
                                                                  background:
                                                                    'white',
                                                                  borderRadius:
                                                                    '6px',
                                                                  border:
                                                                    '1px solid #e5e7eb',
                                                                },
                                                              },
                                                              React.createElement(
                                                                'div',
                                                                null,
                                                                React.createElement(
                                                                  'p',
                                                                  {
                                                                    style: {
                                                                      fontWeight:
                                                                        '600',
                                                                      fontSize:
                                                                        '13px',
                                                                    },
                                                                  },
                                                                  item.nombre
                                                                ),
                                                                React.createElement(
                                                                  'p',
                                                                  {
                                                                    style: {
                                                                      fontSize:
                                                                        '11px',
                                                                      color:
                                                                        '#6b7280',
                                                                    },
                                                                  },
                                                                  item.categoria +
                                                                    ' · ' +
                                                                    item.cantidadEsperada +
                                                                    ' ' +
                                                                    (item.unidad ||
                                                                      'u')
                                                                )
                                                              ),
                                                              React.createElement(
                                                                'div',
                                                                {
                                                                  style: {
                                                                    display:
                                                                      'flex',
                                                                    gap: '6px',
                                                                    alignItems:
                                                                      'center',
                                                                  },
                                                                },
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '3px 8px',
                                                                      background:
                                                                        '#e5e7eb',
                                                                      border:
                                                                        'none',
                                                                      borderRadius:
                                                                        '4px',
                                                                      cursor:
                                                                        'pointer',
                                                                      fontSize:
                                                                        '12px',
                                                                      fontWeight:
                                                                        'bold',
                                                                    },
                                                                    onClick:
                                                                      function (
                                                                        e
                                                                      ) {
                                                                        e.stopPropagation();
                                                                        props.onActualizarCantidadItemSubcomp(
                                                                          v.id,
                                                                          comp.id,
                                                                          sub.id,
                                                                          item.itemId,
                                                                          Math.max(
                                                                            1,
                                                                            (item.cantidadEsperada ||
                                                                              1) -
                                                                              1
                                                                          )
                                                                        );
                                                                      },
                                                                  },
                                                                  '-'
                                                                ),
                                                                React.createElement(
                                                                  'span',
                                                                  {
                                                                    style: {
                                                                      background:
                                                                        '#dbeafe',
                                                                      color:
                                                                        '#1e40af',
                                                                      padding:
                                                                        '3px 10px',
                                                                      borderRadius:
                                                                        '4px',
                                                                      fontWeight:
                                                                        '700',
                                                                      fontSize:
                                                                        '13px',
                                                                    },
                                                                  },
                                                                  item.cantidadEsperada
                                                                ),
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '3px 8px',
                                                                      background:
                                                                        '#e5e7eb',
                                                                      border:
                                                                        'none',
                                                                      borderRadius:
                                                                        '4px',
                                                                      cursor:
                                                                        'pointer',
                                                                      fontSize:
                                                                        '12px',
                                                                      fontWeight:
                                                                        'bold',
                                                                    },
                                                                    onClick:
                                                                      function (
                                                                        e
                                                                      ) {
                                                                        e.stopPropagation();
                                                                        props.onActualizarCantidadItemSubcomp(
                                                                          v.id,
                                                                          comp.id,
                                                                          sub.id,
                                                                          item.itemId,
                                                                          (item.cantidadEsperada ||
                                                                            1) +
                                                                            1
                                                                        );
                                                                      },
                                                                  },
                                                                  '+'
                                                                ),
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '3px 8px',
                                                                      background:
                                                                        '#ef4444',
                                                                      color:
                                                                        'white',
                                                                      border:
                                                                        'none',
                                                                      borderRadius:
                                                                        '4px',
                                                                      cursor:
                                                                        'pointer',
                                                                      fontSize:
                                                                        '11px',
                                                                    },
                                                                    onClick:
                                                                      function (
                                                                        e
                                                                      ) {
                                                                        e.stopPropagation();
                                                                        if (
                                                                          window.confirm(
                                                                            '¿Quitar ' +
                                                                              item.nombre +
                                                                              '?'
                                                                          )
                                                                        ) {
                                                                          props.onEliminarItemSubcomp(
                                                                            v.id,
                                                                            comp.id,
                                                                            sub.id,
                                                                            item.itemId
                                                                          );
                                                                        }
                                                                      },
                                                                  },
                                                                  '✕'
                                                                )
                                                              )
                                                            );
                                                          }
                                                        )
                                                      )
                                                )
                                              );
                                            }
                                          )
                                        )
                                  )
                              );
                            })
                          )
                    ),

                  tabActual === 'items' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#f0fdf4',
                            padding: '16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            border: '1px solid #bbf7d0',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#15803d',
                              marginBottom: '12px',
                            },
                          },
                          '➕ Asignar Item General'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto',
                              gap: '10px',
                              alignItems: 'end',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Item del Inventario'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: itemAsignar,
                                onChange: function (e) {
                                  setItemAsignar(e.target.value);
                                },
                                style: styles.input,
                              },
                              React.createElement(
                                'option',
                                { value: '' },
                                'Seleccionar item...'
                              ),
                              props.inventario
                                .filter(function (i) {
                                  return (i.stock || 0) > 0;
                                })
                                .map(function (i) {
                                  return React.createElement(
                                    'option',
                                    { key: i.id, value: i.id },
                                    i.nombre +
                                      ' - Stock: ' +
                                      (i.stock || 0) +
                                      ' ' +
                                      (i.unidad || 'u')
                                  );
                                })
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Cantidad'
                            ),
                            React.createElement('input', {
                              type: 'number',
                              value: cantAsignar,
                              onChange: function (e) {
                                setCantAsignar(parseInt(e.target.value) || 1);
                              },
                              style: Object.assign({}, styles.input, {
                                width: '80px',
                              }),
                              min: '1',
                            })
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 16px',
                                background: '#15803d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function (e) {
                                e.stopPropagation();
                                if (!itemAsignar) {
                                  alert('Seleccioná un item');
                                  return;
                                }
                                props.onAsignarItem(
                                  v.id,
                                  itemAsignar,
                                  cantAsignar
                                );
                                setItemAsignar('');
                                setCantAsignar(1);
                              },
                            },
                            '➕ Asignar'
                          )
                        )
                      ),
                      itemsAsignados.length === 0
                        ? React.createElement(
                            'p',
                            {
                              style: {
                                color: '#6b7280',
                                textAlign: 'center',
                                padding: '24px',
                              },
                            },
                            'No hay items asignados'
                          )
                        : React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              },
                            },
                            itemsAsignados.map(function (item) {
                              return React.createElement(
                                'div',
                                {
                                  key: item.itemId,
                                  style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    background: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                  },
                                },
                                React.createElement(
                                  'div',
                                  null,
                                  React.createElement(
                                    'p',
                                    {
                                      style: {
                                        fontWeight: '600',
                                        fontSize: '14px',
                                      },
                                    },
                                    item.nombre
                                  ),
                                  React.createElement(
                                    'p',
                                    {
                                      style: {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                      },
                                    },
                                    item.categoria +
                                      ' · ' +
                                      item.cantidad +
                                      ' ' +
                                      (item.unidad || 'u')
                                  )
                                ),
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      display: 'flex',
                                      gap: '6px',
                                      alignItems: 'center',
                                    },
                                  },
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '4px 10px',
                                        background: '#e5e7eb',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        props.onActualizarCantidadItem(
                                          v.id,
                                          item.itemId,
                                          Math.max(1, (item.cantidad || 1) - 1)
                                        );
                                      },
                                    },
                                    '-'
                                  ),
                                  React.createElement(
                                    'span',
                                    {
                                      style: {
                                        background: '#dbeafe',
                                        color: '#1e40af',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                      },
                                    },
                                    item.cantidad
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '4px 10px',
                                        background: '#e5e7eb',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        props.onActualizarCantidadItem(
                                          v.id,
                                          item.itemId,
                                          (item.cantidad || 1) + 1
                                        );
                                      },
                                    },
                                    '+'
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '6px 10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        if (
                                          window.confirm(
                                            '¿Devolver ' + item.nombre + '?'
                                          )
                                        ) {
                                          props.onDesasignarItem(
                                            v.id,
                                            item.itemId
                                          );
                                        }
                                      },
                                    },
                                    '↩️'
                                  )
                                )
                              );
                            })
                          )
                    ),

                  tabActual === 'eras' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#f5f3ff',
                            padding: '16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            border: '1px solid #ddd6fe',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#7c3aed',
                              marginBottom: '12px',
                            },
                          },
                          '➕ Asignar ERA'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement(
                            'select',
                            {
                              value: eraAsignar,
                              onChange: function (e) {
                                setEraAsignar(e.target.value);
                              },
                              style: Object.assign({}, styles.input, {
                                flex: 1,
                              }),
                            },
                            React.createElement(
                              'option',
                              { value: '' },
                              'Seleccionar ERA disponible...'
                            ),
                            erasDisponibles.map(function (era) {
                              return React.createElement(
                                'option',
                                { key: era.id, value: era.id },
                                era.marca +
                                  ' ' +
                                  era.modelo +
                                  ' [' +
                                  era.serial +
                                  '] - ' +
                                  era.presion +
                                  ' bar' +
                                  (era.codigoInterno
                                    ? ' · ' + era.codigoInterno
                                    : '')
                              );
                            })
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '10px 16px',
                                background: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              },
                              onClick: function (e) {
                                e.stopPropagation();
                                if (!eraAsignar) {
                                  alert('Seleccioná una ERA');
                                  return;
                                }
                                props.onAsignarERA(v.id, eraAsignar);
                                setEraAsignar('');
                              },
                            },
                            '➕ Asignar'
                          )
                        )
                      ),
                      erasAsignadas.length === 0
                        ? React.createElement(
                            'p',
                            {
                              style: {
                                color: '#6b7280',
                                textAlign: 'center',
                                padding: '24px',
                              },
                            },
                            'No hay ERAs asignadas'
                          )
                        : React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              },
                            },
                            erasAsignadas.map(function (era) {
                              var vencTubo = verificarVencimiento(
                                era.vencimientoTubo
                              );
                              var vencPH = verificarVencimiento(
                                era.pruebaHidraulica
                              );
                              var tieneAlerta =
                                vencTubo === 'vencido' || vencPH === 'vencido';
                              return React.createElement(
                                'div',
                                {
                                  key: era.id,
                                  style: {
                                    padding: '12px 14px',
                                    background: tieneAlerta
                                      ? '#fef2f2'
                                      : '#f5f3ff',
                                    borderRadius: '8px',
                                    border:
                                      '1px solid ' +
                                      (tieneAlerta ? '#fecaca' : '#ddd6fe'),
                                  },
                                },
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    },
                                  },
                                  React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                      'p',
                                      {
                                        style: {
                                          fontWeight: '600',
                                          fontSize: '14px',
                                          color: '#7c3aed',
                                        },
                                      },
                                      '🎽 ' + era.marca + ' ' + era.modelo
                                    ),
                                    React.createElement(
                                      'div',
                                      {
                                        style: {
                                          display: 'flex',
                                          gap: '8px',
                                          flexWrap: 'wrap',
                                          marginTop: '4px',
                                        },
                                      },
                                      era.codigoInterno &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              background: '#ede9fe',
                                              color: '#7c3aed',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontWeight: '600',
                                            },
                                          },
                                          '🏷️ ' + era.codigoInterno
                                        ),
                                      React.createElement(
                                        'span',
                                        {
                                          style: {
                                            fontSize: '11px',
                                            color: '#6b7280',
                                          },
                                        },
                                        '🔖 ' + era.serial
                                      ),
                                      React.createElement(
                                        'span',
                                        {
                                          style: {
                                            fontSize: '11px',
                                            background:
                                              (era.presion || 0) >= 280
                                                ? '#d1fae5'
                                                : '#fee2e2',
                                            color:
                                              (era.presion || 0) >= 280
                                                ? '#065f46'
                                                : '#dc2626',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: '600',
                                          },
                                        },
                                        (era.presion || 0) + ' bar'
                                      ),
                                      era.vencimientoTubo &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              color:
                                                vencTubo === 'vencido'
                                                  ? '#dc2626'
                                                  : vencTubo === 'proximo'
                                                  ? '#d97706'
                                                  : '#6b7280',
                                              fontWeight:
                                                vencTubo !== 'ok'
                                                  ? '600'
                                                  : '400',
                                            },
                                          },
                                          '🧪 Tubo: ' +
                                            era.vencimientoTubo +
                                            (vencTubo === 'vencido'
                                              ? ' ⚠️'
                                              : vencTubo === 'proximo'
                                              ? ' ⚠️'
                                              : '')
                                        ),
                                      era.pruebaHidraulica &&
                                        React.createElement(
                                          'span',
                                          {
                                            style: {
                                              fontSize: '11px',
                                              color:
                                                vencPH === 'vencido'
                                                  ? '#dc2626'
                                                  : vencPH === 'proximo'
                                                  ? '#d97706'
                                                  : '#6b7280',
                                              fontWeight:
                                                vencPH !== 'ok' ? '600' : '400',
                                            },
                                          },
                                          '🔧 PH: ' +
                                            era.pruebaHidraulica +
                                            (vencPH === 'vencido'
                                              ? ' ⚠️'
                                              : vencPH === 'proximo'
                                              ? ' ⚠️'
                                              : '')
                                        )
                                    )
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '6px 10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        if (
                                          window.confirm(
                                            '¿Desasignar ERA ' +
                                              era.serial +
                                              '?'
                                          )
                                        ) {
                                          props.onDesasignarERA(v.id, era.id);
                                        }
                                      },
                                    },
                                    '↩️ Quitar'
                                  )
                                )
                              );
                            })
                          )
                    ),

                  tabActual === 'vtv' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: Object.assign({}, styles.card, {
                            background: vtvBg,
                            border:
                              '2px solid ' +
                              (vtvEstado === 'apta'
                                ? '#a7f3d0'
                                : vtvEstado === 'proxima'
                                ? '#fde68a'
                                : vtvEstado === 'vencida'
                                ? '#fecaca'
                                : '#e5e7eb'),
                          }),
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: vtvColor,
                              marginBottom: '16px',
                              fontSize: '16px',
                            },
                          },
                          '🚗 Control VTV - ' +
                            (vtvEstado === 'apta'
                              ? '✅ APTA'
                              : vtvEstado === 'proxima'
                              ? '⚠️ PRÓXIMA A VENCER'
                              : vtvEstado === 'vencida'
                              ? '❌ VENCIDA'
                              : '📋 Sin datos')
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Vencimiento VTV'
                            ),
                            React.createElement('input', {
                              type: 'date',
                              value: (v.vtv || {}).vencimiento || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    vencimiento: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'N° Certificado'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (v.vtv || {}).certificado || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    certificado: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                              placeholder: 'Número de certificado',
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Planta de Revisión'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (v.vtv || {}).planta || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    planta: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                              placeholder: 'Nombre de la planta',
                            })
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Fecha Última Revisión'
                            ),
                            React.createElement('input', {
                              type: 'date',
                              value: (v.vtv || {}).ultimaRevision || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    ultimaRevision: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                            })
                          ),
                          React.createElement(
                            'div',
                            { style: { gridColumn: 'span 2' } },
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Observaciones'
                            ),
                            React.createElement('input', {
                              type: 'text',
                              value: (v.vtv || {}).observaciones || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    observaciones: e.target.value,
                                  }),
                                });
                              },
                              style: styles.input,
                              placeholder: 'Observaciones de la VTV...',
                            })
                          )
                        ),
                        diasVtv !== null &&
                          React.createElement(
                            'div',
                            {
                              style: {
                                marginTop: '16px',
                                padding: '12px',
                                background: 'white',
                                borderRadius: '8px',
                                textAlign: 'center',
                              },
                            },
                            React.createElement(
                              'p',
                              {
                                style: {
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: vtvColor,
                                },
                              },
                              diasVtv < 0
                                ? '❌ Vencida hace ' +
                                    Math.abs(diasVtv) +
                                    ' días'
                                : diasVtv === 0
                                ? '⚠️ Vence HOY'
                                : '📅 Vence en ' + diasVtv + ' días'
                            )
                          )
                      )
                    )
                )
            );
          })
        )
  );
}

// ============================================
// INVENTARIO
// ============================================
function Inventario(props) {
  var formState = useState({
    nombre: '',
    categoria: 'herramienta',
    stock: 0,
    stockMinimo: 5,
    unidad: 'u',
    descripcion: '',
    ubicacion: '',
    codigoInterno: '',
  });
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var editandoState = useState(null);
  var editando = editandoState[0];
  var setEditando = editandoState[1];
  var formEditState = useState({});
  var formEdit = formEditState[0];
  var setFormEdit = formEditState[1];
  var busquedaState = useState('');
  var busqueda = busquedaState[0];
  var setBusqueda = busquedaState[1];
  var categoriaFiltroState = useState('');
  var categoriaFiltro = categoriaFiltroState[0];
  var setCategoriaFiltro = categoriaFiltroState[1];
  var movModalState = useState(null);
  var movModal = movModalState[0];
  var setMovModal = movModalState[1];
  var cantMovState = useState(1);
  var cantMov = cantMovState[0];
  var setCantMov = cantMovState[1];
  var respMovState = useState('');
  var respMov = respMovState[0];
  var setRespMov = respMovState[1];
  var motivoMovState = useState('');
  var motivoMov = motivoMovState[0];
  var setMotivoMov = motivoMovState[1];

  var categorias = [
    'herramienta',
    'equipo',
    'material',
    'repuesto',
    'EPP',
    'otro',
  ];
  var catColores = {
    herramienta: '#3b82f6',
    equipo: '#8b5cf6',
    material: '#10b981',
    repuesto: '#f59e0b',
    EPP: '#ef4444',
    otro: '#6b7280',
  };

  var inventarioFiltrado = props.inventario.filter(function (i) {
    var matchBusqueda =
      !busqueda ||
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.codigoInterno || '').toLowerCase().includes(busqueda.toLowerCase());
    var matchCategoria = !categoriaFiltro || i.categoria === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  var iniciarEdicion = function (item) {
    setEditando(item.id);
    setFormEdit({
      nombre: item.nombre,
      categoria: item.categoria,
      stock: item.stock,
      stockMinimo: item.stockMinimo,
      unidad: item.unidad,
      descripcion: item.descripcion || '',
      ubicacion: item.ubicacion || '',
      codigoInterno: item.codigoInterno || '',
    });
  };

  var guardarEdicion = async function (itemId) {
    await props.onActualizar(itemId, formEdit);
    setEditando(null);
    alert('✅ Item actualizado correctamente');
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    var id = await props.onAgregar(form);
    if (id) {
      setForm({
        nombre: '',
        categoria: 'herramienta',
        stock: 0,
        stockMinimo: 5,
        unidad: 'u',
        descripcion: '',
        ubicacion: '',
        codigoInterno: '',
      });
      setMostrarForm(false);
      alert('✅ Item agregado');
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '📦 Inventario'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Item'
      )
    ),

    props.itemsBajoStock.length > 0 &&
      React.createElement(
        'div',
        {
          style: {
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          },
        },
        React.createElement(
          'h4',
          {
            style: {
              fontWeight: 'bold',
              color: '#92400e',
              marginBottom: '8px',
            },
          },
          '⚠️ Items con stock bajo'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
          props.itemsBajoStock.map(function (i) {
            return React.createElement(
              'span',
              {
                key: i.id,
                style: {
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                },
              },
              (i.codigoInterno ? '[' + i.codigoInterno + '] ' : '') +
                i.nombre +
                ': ' +
                (i.stock || 0) +
                ' ' +
                (i.unidad || 'u')
            );
          })
        )
      ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0f9ff',
            border: '2px solid #0ea5e9',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#0369a1' }) },
          '➕ Nuevo Item'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Nombre *'),
              React.createElement('input', {
                type: 'text',
                value: form.nombre,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { nombre: e.target.value }));
                },
                style: styles.input,
                required: true,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                '🏷️ Código Interno'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.codigoInterno,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { codigoInterno: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Ej: INV-001',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Categoría'
              ),
              React.createElement(
                'select',
                {
                  value: form.categoria,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { categoria: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                categorias.map(function (c) {
                  return React.createElement('option', { key: c, value: c }, c);
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Stock Inicial'
              ),
              React.createElement('input', {
                type: 'number',
                value: form.stock,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      stock: parseInt(e.target.value) || 0,
                    })
                  );
                },
                style: styles.input,
                min: '0',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Stock Mínimo'
              ),
              React.createElement('input', {
                type: 'number',
                value: form.stockMinimo,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      stockMinimo: parseInt(e.target.value) || 0,
                    })
                  );
                },
                style: styles.input,
                min: '0',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Unidad'),
              React.createElement('input', {
                type: '            text',
                value: form.unidad,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { unidad: e.target.value }));
                },
                style: styles.input,
                placeholder: 'u, kg, lt...',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Ubicación'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.ubicacion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { ubicacion: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Ej: Estante A',
              })
            ),
            React.createElement(
              'div',
              { style: { gridColumn: 'span 2' } },
              React.createElement(
                'label',
                { style: styles.label },
                'Descripción'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.descripcion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { descripcion: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: 'Descripción del item...',
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              style: {
                width: '100%',
                padding: '12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              },
            },
            '💾 Agregar Item'
          )
        )
      ),

    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        },
      },
      React.createElement('input', {
        type: 'text',
        placeholder: '🔍 Buscar por nombre o código...',
        value: busqueda,
        onChange: function (e) {
          setBusqueda(e.target.value);
        },
        style: Object.assign({}, styles.input, { flex: 1, minWidth: '200px' }),
      }),
      React.createElement(
        'select',
        {
          value: categoriaFiltro,
          onChange: function (e) {
            setCategoriaFiltro(e.target.value);
          },
          style: Object.assign({}, styles.input, { width: '180px' }),
        },
        React.createElement('option', { value: '' }, 'Todas las categorías'),
        categorias.map(function (c) {
          return React.createElement('option', { key: c, value: c }, c);
        })
      )
    ),

    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      inventarioFiltrado.map(function (item) {
        var bajStock = (item.stock || 0) <= (item.stockMinimo || 5);
        var isEditando = editando === item.id;
        return React.createElement(
          'div',
          {
            key: item.id,
            style: Object.assign({}, styles.card, {
              border: '2px solid ' + (bajStock ? '#f59e0b' : '#e5e7eb'),
              background: bajStock ? '#fffbeb' : 'white',
              marginBottom: '0',
            }),
          },
          isEditando
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'h4',
                  {
                    style: {
                      fontWeight: 'bold',
                      color: '#0369a1',
                      marginBottom: '12px',
                    },
                  },
                  '✏️ Editando: ' + item.nombre
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                      marginBottom: '12px',
                    },
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Nombre'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: formEdit.nombre || '',
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            nombre: e.target.value,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      '🏷️ Código Interno'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: formEdit.codigoInterno || '',
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            codigoInterno: e.target.value,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Categoría'
                    ),
                    React.createElement(
                      'select',
                      {
                        value: formEdit.categoria || '',
                        onChange: function (e) {
                          setFormEdit(
                            Object.assign({}, formEdit, {
                              categoria: e.target.value,
                            })
                          );
                        },
                        style: styles.input,
                      },
                      categorias.map(function (c) {
                        return React.createElement(
                          'option',
                          { key: c, value: c },
                          c
                        );
                      })
                    )
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Stock Mínimo'
                    ),
                    React.createElement('input', {
                      type: 'number',
                      value: formEdit.stockMinimo || 0,
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            stockMinimo: parseInt(e.target.value) || 0,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Unidad'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: formEdit.unidad || '',
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            unidad: e.target.value,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Ubicación'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: formEdit.ubicacion || '',
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            ubicacion: e.target.value,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  ),
                  React.createElement(
                    'div',
                    { style: { gridColumn: 'span 3' } },
                    React.createElement(
                      'label',
                      { style: styles.label },
                      'Descripción'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: formEdit.descripcion || '',
                      onChange: function (e) {
                        setFormEdit(
                          Object.assign({}, formEdit, {
                            descripcion: e.target.value,
                          })
                        );
                      },
                      style: styles.input,
                    })
                  )
                ),
                React.createElement(
                  'div',
                  { style: { display: 'flex', gap: '10px' } },
                  React.createElement(
                    'button',
                    {
                      style: {
                        flex: 1,
                        padding: '10px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      },
                      onClick: function () {
                        guardarEdicion(item.id);
                      },
                    },
                    '💾 Guardar'
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        flex: 1,
                        padding: '10px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      },
                      onClick: function () {
                        setEditando(null);
                      },
                    },
                    '✖ Cancelar'
                  )
                )
              )
            : React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: catColores[item.categoria] || '#6b7280',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                    },
                    item.categoria
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '2px',
                        },
                      },
                      React.createElement(
                        'p',
                        { style: { fontWeight: '700', fontSize: '15px' } },
                        item.nombre
                      ),
                      item.codigoInterno &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '🏷️ ' + item.codigoInterno
                        )
                    ),
                    React.createElement(
                      'p',
                      { style: { fontSize: '12px', color: '#6b7280' } },
                      (item.ubicacion ? '📍 ' + item.ubicacion + ' · ' : '') +
                        (item.descripcion || '')
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    },
                  },
                  React.createElement(
                    'div',
                    { style: { textAlign: 'center' } },
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '11px',
                          color: '#6b7280',
                          marginBottom: '2px',
                        },
                      },
                      'Stock'
                    ),
                    React.createElement(
                      'span',
                      {
                        style: {
                          background: bajStock ? '#fee2e2' : '#d1fae5',
                          color: bajStock ? '#dc2626' : '#065f46',
                          padding: '4px 14px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '16px',
                        },
                      },
                      (item.stock || 0) + ' ' + (item.unidad || 'u')
                    )
                  ),
                  React.createElement(
                    'div',
                    { style: { textAlign: 'center' } },
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '11px',
                          color: '#6b7280',
                          marginBottom: '2px',
                        },
                      },
                      'Mínimo'
                    ),
                    React.createElement(
                      'span',
                      {
                        style: {
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '4px 14px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                        },
                      },
                      (item.stockMinimo || 5) + ' ' + (item.unidad || 'u')
                    )
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '8px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        iniciarEdicion(item);
                      },
                    },
                    '✏️ Editar'
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '8px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        setMovModal({ item: item, tipo: 'entrada' });
                        setCantMov(1);
                        setRespMov(props.usuario ? props.usuario.nombre : '');
                        setMotivoMov('');
                      },
                    },
                    '➕ Entrada'
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '8px 12px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        setMovModal({ item: item, tipo: 'salida' });
                        setCantMov(1);
                        setRespMov(props.usuario ? props.usuario.nombre : '');
                        setMotivoMov('');
                      },
                    },
                    '➖ Salida'
                  ),
                  React.createElement(
                    'button',
                    {
                      style: {
                        padding: '8px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                      onClick: function () {
                        if (window.confirm('¿Eliminar ' + item.nombre + '?')) {
                          props.onEliminar(item.id);
                        }
                      },
                    },
                    '🗑️'
                  )
                )
              )
        );
      })
    ),

    movModal &&
      React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              width: '400px',
              maxWidth: '90vw',
            },
          },
          React.createElement(
            'h3',
            {
              style: {
                fontWeight: 'bold',
                fontSize: '18px',
                marginBottom: '20px',
                color: movModal.tipo === 'entrada' ? '#059669' : '#d97706',
              },
            },
            movModal.tipo === 'entrada'
              ? '➕ Entrada de Stock'
              : '➖ Salida de Stock'
          ),
          React.createElement(
            'p',
            { style: { fontWeight: '600', marginBottom: '4px' } },
            movModal.item.nombre
          ),
          movModal.item.codigoInterno &&
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '16px',
                },
              },
              '🏷️ ' + movModal.item.codigoInterno
            ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '20px',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Cantidad'),
              React.createElement('input', {
                type: 'number',
                value: cantMov,
                onChange: function (e) {
                  setCantMov(parseInt(e.target.value) || 1);
                },
                style: styles.input,
                min: '1',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Responsable'
              ),
              React.createElement('input', {
                type: 'text',
                value: respMov,
                onChange: function (e) {
                  setRespMov(e.target.value);
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Motivo'),
              React.createElement('input', {
                type: 'text',
                value: motivoMov,
                onChange: function (e) {
                  setMotivoMov(e.target.value);
                },
                style: styles.input,
                placeholder: 'Motivo del movimiento...',
              })
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '10px' } },
            React.createElement(
              'button',
              {
                style: {
                  flex: 1,
                  padding: '12px',
                  background:
                    movModal.tipo === 'entrada' ? '#10b981' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                },
                onClick: async function () {
                  if (movModal.tipo === 'entrada') {
                    await props.onAgregarStock(
                      movModal.item.id,
                      cantMov,
                      respMov,
                      motivoMov
                    );
                  } else {
                    await props.onDescontar(
                      movModal.item.id,
                      cantMov,
                      respMov,
                      motivoMov
                    );
                  }
                  setMovModal(null);
                },
              },
              movModal.tipo === 'entrada'
                ? '➕ Confirmar Entrada'
                : '➖ Confirmar Salida'
            ),
            React.createElement(
              'button',
              {
                style: {
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                },
                onClick: function () {
                  setMovModal(null);
                },
              },
              '✖ Cancelar'
            )
          )
        )
      )
  );
}

function Panol(props) {
  var itemSelState = useState('');
  var itemSel = itemSelState[0];
  var setItemSel = itemSelState[1];
  var cantState = useState(1);
  var cant = cantState[0];
  var setCant = cantState[1];
  var respState = useState('');
  var resp = respState[0];
  var setResp = respState[1];
  var motivoState = useState('');
  var motivo = motivoState[0];
  var setMotivo = motivoState[1];
  var tipoMovState = useState('salida');
  var tipoMov = tipoMovState[0];
  var setTipoMov = tipoMovState[1];
  var busquedaState = useState('');
  var busqueda = busquedaState[0];
  var setBusqueda = busquedaState[1];

  useEffect(
    function () {
      if (props.usuario) setResp(props.usuario.nombre);
    },
    [props.usuario]
  );

  var movimientosFiltrados = props.movimientos.filter(function (m) {
    return (
      !busqueda ||
      (m.itemNombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.responsable || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  var handleMovimiento = async function () {
    if (!itemSel) {
      alert('Seleccioná un item');
      return;
    }
    if (cant <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (!resp.trim()) {
      alert('Ingresá el responsable');
      return;
    }
    if (tipoMov === 'salida') {
      await props.onDescontar(itemSel, cant, resp, motivo);
    } else {
      await props.onAgregarStock(itemSel, cant, resp, motivo);
    }
    setItemSel('');
    setCant(1);
    setMotivo('');
    alert('✅ Movimiento registrado');
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'h2',
      { style: Object.assign({}, styles.pageTitle, { marginBottom: '24px' }) },
      '🧰 Pañol'
    ),
    React.createElement(
      'div',
      {
        style: Object.assign({}, styles.card, {
          background: '#f0fdf4',
          border: '2px solid #bbf7d0',
          marginBottom: '24px',
        }),
      },
      React.createElement(
        'h3',
        { style: Object.assign({}, styles.cardTitle, { color: '#15803d' }) },
        '📦 Registrar Movimiento'
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '16px',
          },
        },
        React.createElement(
          'div',
          { style: { gridColumn: 'span 2' } },
          React.createElement(
            'label',
            { style: styles.label },
            'Tipo de Movimiento'
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '10px' } },
            React.createElement(
              'button',
              {
                style: {
                  flex: 1,
                  padding: '12px',
                  background: tipoMov === 'salida' ? '#f59e0b' : '#e5e7eb',
                  color: tipoMov === 'salida' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '15px',
                },
                onClick: function () {
                  setTipoMov('salida');
                },
              },
              '➖ Salida'
            ),
            React.createElement(
              'button',
              {
                style: {
                  flex: 1,
                  padding: '12px',
                  background: tipoMov === 'entrada' ? '#10b981' : '#e5e7eb',
                  color: tipoMov === 'entrada' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '15px',
                },
                onClick: function () {
                  setTipoMov('entrada');
                },
              },
              '➕ Entrada'
            )
          )
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { style: styles.label }, 'Item'),
          React.createElement(
            'select',
            {
              value: itemSel,
              onChange: function (e) {
                setItemSel(e.target.value);
              },
              style: styles.input,
            },
            React.createElement('option', { value: '' }, 'Seleccionar item...'),
            props.inventario.map(function (i) {
              return React.createElement(
                'option',
                { key: i.id, value: i.id },
                (i.codigoInterno ? '[' + i.codigoInterno + '] ' : '') +
                  i.nombre +
                  ' - Stock: ' +
                  (i.stock || 0) +
                  ' ' +
                  (i.unidad || 'u')
              );
            })
          )
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { style: styles.label }, 'Cantidad'),
          React.createElement('input', {
            type: 'number',
            value: cant,
            onChange: function (e) {
              setCant(parseInt(e.target.value) || 1);
            },
            style: styles.input,
            min: '1',
          })
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { style: styles.label }, 'Responsable'),
          React.createElement('input', {
            type: 'text',
            value: resp,
            onChange: function (e) {
              setResp(e.target.value);
            },
            style: styles.input,
            placeholder: 'Nombre del responsable',
          })
        ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { style: styles.label }, 'Motivo'),
          React.createElement('input', {
            type: 'text',
            value: motivo,
            onChange: function (e) {
              setMotivo(e.target.value);
            },
            style: styles.input,
            placeholder: 'Motivo del movimiento...',
          })
        )
      ),
      React.createElement(
        'button',
        {
          style: {
            width: '100%',
            padding: '14px',
            background: tipoMov === 'salida' ? '#f59e0b' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
          },
          onClick: handleMovimiento,
        },
        tipoMov === 'salida' ? '➖ Registrar Salida' : '➕ Registrar Entrada'
      )
    ),

    React.createElement(
      'div',
      { style: styles.card },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          },
        },
        React.createElement(
          'h3',
          { style: styles.cardTitle },
          '📋 Historial de Movimientos'
        ),
        React.createElement('input', {
          type: 'text',
          placeholder: '🔍 Buscar...',
          value: busqueda,
          onChange: function (e) {
            setBusqueda(e.target.value);
          },
          style: Object.assign({}, styles.input, { width: '250px' }),
        })
      ),
      movimientosFiltrados.length === 0
        ? React.createElement(
            'div',
            {
              style: { textAlign: 'center', padding: '40px', color: '#6b7280' },
            },
            React.createElement(
              'div',
              { style: { fontSize: '48px', marginBottom: '12px' } },
              '📋'
            ),
            React.createElement('p', null, 'No hay movimientos registrados')
          )
        : React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '500px',
                overflowY: 'auto',
              },
            },
            movimientosFiltrados.map(function (m) {
              var esEntrada = m.tipo === 'entrada';
              var fecha =
                m.creadoEn && m.creadoEn.toDate
                  ? m.creadoEn.toDate().toLocaleString('es-AR')
                  : '-';
              return React.createElement(
                'div',
                {
                  key: m.id,
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: esEntrada ? '#f0fdf4' : '#fffbeb',
                    borderRadius: '8px',
                    border: '1px solid ' + (esEntrada ? '#bbf7d0' : '#fde68a'),
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    },
                  },
                  React.createElement(
                    'span',
                    { style: { fontSize: '20px' } },
                    esEntrada ? '➕' : '➖'
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'p',
                      { style: { fontWeight: '600', fontSize: '14px' } },
                      m.itemNombre || '-'
                    ),
                    React.createElement(
                      'p',
                      { style: { fontSize: '12px', color: '#6b7280' } },
                      '👤 ' +
                        (m.responsable || '-') +
                        (m.motivo ? ' · ' + m.motivo : '')
                    ),
                    React.createElement(
                      'p',
                      { style: { fontSize: '11px', color: '#9ca3af' } },
                      '📅 ' + fecha
                    )
                  )
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      background: esEntrada ? '#d1fae5' : '#fef3c7',
                      color: esEntrada ? '#065f46' : '#92400e',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '15px',
                    },
                  },
                  (esEntrada ? '+' : '-') + m.cantidad
                )
              );
            })
          )
    )
  );
}
function Checklists(props) {
  var vistaState = useState('lista');
  var vista = vistaState[0];
  var setVista = vistaState[1];
  var vehiculoSelState = useState(null);
  var vehiculoSel = vehiculoSelState[0];
  var setVehiculoSel = vehiculoSelState[1];
  var tipoState = useState('completo');
  var tipo = tipoState[0];
  var setTipo = tipoState[1];
  var obsState = useState('');
  var obs = obsState[0];
  var setObs = obsState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var estadoFluidosState = useState({});
  var estadoFluidos = estadoFluidosState[0];
  var setEstadoFluidos = estadoFluidosState[1];
  var estadoLucesState = useState({});
  var estadoLuces = estadoLucesState[0];
  var setEstadoLuces = estadoLucesState[1];
  var estadoItemsState = useState({});
  var estadoItems = estadoItemsState[0];
  var setEstadoItems = estadoItemsState[1];
  var estadoERAsState = useState({});
  var estadoERAs = estadoERAsState[0];
  var setEstadoERAs = estadoERAsState[1];
  var checklistDetalleState = useState(null);
  var checklistDetalle = checklistDetalleState[0];
  var setChecklistDetalle = checklistDetalleState[1];

  var fluidosConfig = [
    { key: 'aceite', label: '🛢️ Aceite de Motor' },
    { key: 'refrigerante', label: '🌡️ Refrigerante' },
    { key: 'combustible', label: '⛽ Combustible' },
    { key: 'liquidoFrenos', label: '🔴 Líquido de Frenos' },
    { key: 'aguaLimpia', label: '💧 Agua Limpiaparabrisas' },
  ];

  var lucesConfig = [
    { key: 'luzDelantera', label: '💡 Luces Delanteras' },
    { key: 'luzTrasera', label: '🔴 Luces Traseras' },
    { key: 'luzEmergencia', label: '🚨 Luces de Emergencia' },
    { key: 'sirena', label: '📢 Sirena' },
    { key: 'bocina', label: '📯 Bocina' },
    { key: 'balizas', label: '⚠️ Balizas' },
    { key: 'luzInterior', label: '💡 Luz Interior' },
    { key: 'luzRetroceso', label: '🔦 Luz de Retroceso' },
  ];

  useEffect(
    function () {
      if (!vehiculoSel) return;

      var fluidos = {};
      fluidosConfig.forEach(function (f) {
        fluidos[f.key] = { ok: null, observaciones: '' };
      });
      setEstadoFluidos(fluidos);

      var luces = {};
      lucesConfig.forEach(function (l) {
        luces[l.key] = { ok: null, observaciones: '' };
      });
      setEstadoLuces(luces);

      var items = {};
      var compartimientos = vehiculoSel.compartimientos || [];
      compartimientos.forEach(function (comp) {
        (comp.subcompartimientos || []).forEach(function (sub) {
          (sub.items || []).forEach(function (item) {
            items[item.itemId] = {
              nombre: item.nombre,
              categoria: item.categoria,
              cantidadEsperada: item.cantidadEsperada,
              cantidadReal: 0,
              ok: null,
              observaciones: '',
              ubicacion: comp.nombre + ' > ' + sub.nombre,
              unidad: item.unidad || 'u',
            };
          });
        });
      });
      (vehiculoSel.itemsAsignados || []).forEach(function (item) {
        if (!items[item.itemId]) {
          items[item.itemId] = {
            nombre: item.nombre,
            categoria: item.categoria,
            cantidadEsperada: item.cantidad,
            cantidadReal: 0,
            ok: null,
            observaciones: '',
            ubicacion: 'General',
            unidad: item.unidad || 'u',
          };
        }
      });
      setEstadoItems(items);

      var eras = {};
      (vehiculoSel.erasAsignadas || []).forEach(function (eraId) {
        var era = props.eras.find(function (e) {
          return e.id === eraId;
        });
        if (era) {
          eras[eraId] = {
            nombre: era.marca + ' ' + era.modelo,
            serial: era.serial,
            codigoInterno: era.codigoInterno || '',
            presionEsperada: 300,
            presionReal: 0,
            ok: null,
            observaciones: '',
          };
        }
      });
      setEstadoERAs(eras);
    },
    [vehiculoSel]
  );

  var guardar = async function () {
    if (!vehiculoSel) return;
    setGuardando(true);
    var todosOk = true;
    Object.values(estadoFluidos).forEach(function (f) {
      if (f.ok === false) todosOk = false;
    });
    Object.values(estadoLuces).forEach(function (l) {
      if (l.ok === false) todosOk = false;
    });
    Object.values(estadoItems).forEach(function (i) {
      if (i.ok === false) todosOk = false;
    });
    Object.values(estadoERAs).forEach(function (e) {
      if (e.ok === false) todosOk = false;
    });
    await props.onGuardar({
      vehiculoId: vehiculoSel.id,
      vehiculoNombre: vehiculoSel.nombre,
      tipo: tipo,
      fluidos: estadoFluidos,
      luces: estadoLuces,
      items: estadoItems,
      eras: estadoERAs,
      observaciones: obs,
      resultado: todosOk ? 'ok' : 'con_novedades',
      usuario: props.usuario ? props.usuario.nombre : 'Sistema',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-AR'),
    });
    setGuardando(false);
    setVista('lista');
    setVehiculoSel(null);
    setObs('');
    alert('✅ Checklist guardado correctamente');
  };

  var renderEstadoBadge = function (ok) {
    if (ok === true)
      return React.createElement(
        'span',
        {
          style: {
            background: '#d1fae5',
            color: '#065f46',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
          },
        },
        '✅ OK'
      );
    if (ok === false)
      return React.createElement(
        'span',
        {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
          },
        },
        '❌ NOK'
      );
    return React.createElement(
      'span',
      {
        style: {
          background: '#f3f4f6',
          color: '#6b7280',
          padding: '3px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '700',
        },
      },
      '⬜ S/D'
    );
  };

  var renderDetalleChecklist = function (cl) {
    var fluidos = cl.fluidos || {};
    var luces = cl.luces || {};
    var items = cl.items || {};
    var eras = cl.eras || {};

    return React.createElement(
      'div',
      {
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '20px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '800px',
            marginTop: '20px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            },
          },
          React.createElement(
            'div',
            null,
            React.createElement(
              'h2',
              {
                style: {
                  fontWeight: 'bold',
                  fontSize: '20px',
                  marginBottom: '4px',
                },
              },
              '📋 Detalle de Checklist'
            ),
            React.createElement(
              'p',
              { style: { fontSize: '14px', color: '#6b7280' } },
              '🚛 ' +
                cl.vehiculoNombre +
                ' · 📅 ' +
                (cl.fecha || '-') +
                ' ' +
                (cl.hora || '') +
                ' · 👤 ' +
                (cl.usuario || '-')
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
            React.createElement(
              'span',
              { style: { fontSize: '32px' } },
              cl.resultado === 'ok' ? '✅' : '⚠️'
            ),
            React.createElement(
              'button',
              {
                style: {
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                },
                onClick: function () {
                  setChecklistDetalle(null);
                },
              },
              '✖ Cerrar'
            )
          )
        ),

        React.createElement(
          'div',
          {
            style: {
              background: cl.resultado === 'ok' ? '#f0fdf4' : '#fef2f2',
              border:
                '2px solid ' + (cl.resultado === 'ok' ? '#bbf7d0' : '#fecaca'),
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
              textAlign: 'center',
            },
          },
          React.createElement(
            'p',
            {
              style: {
                fontSize: '18px',
                fontWeight: '700',
                color: cl.resultado === 'ok' ? '#15803d' : '#dc2626',
              },
            },
            cl.resultado === 'ok'
              ? '✅ CHECKLIST APROBADO - Todo en orden'
              : '⚠️ CHECKLIST CON NOVEDADES - Revisar items marcados'
          ),
          cl.observaciones &&
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '13px',
                  color: '#6b7280',
                  marginTop: '8px',
                  fontStyle: 'italic',
                },
              },
              '💬 ' + cl.observaciones
            )
        ),

        Object.keys(fluidos).length > 0 &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '12px',
                  color: '#92400e',
                  borderBottom: '2px solid #fde68a',
                  paddingBottom: '8px',
                },
              },
              '🛢️ Fluidos'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                },
              },
              fluidosConfig.map(function (fc) {
                var val = fluidos[fc.key];
                if (!val) return null;
                return React.createElement(
                  'div',
                  {
                    key: fc.key,
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background:
                        val.ok === true
                          ? '#f0fdf4'
                          : val.ok === false
                          ? '#fef2f2'
                          : '#f9fafb',
                      borderRadius: '8px',
                      border:
                        '1px solid ' +
                        (val.ok === true
                          ? '#bbf7d0'
                          : val.ok === false
                          ? '#fecaca'
                          : '#e5e7eb'),
                    },
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'p',
                      { style: { fontWeight: '600', fontSize: '13px' } },
                      fc.label
                    ),
                    val.observaciones &&
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic',
                          },
                        },
                        val.observaciones
                      )
                  ),
                  renderEstadoBadge(val.ok)
                );
              })
            )
          ),

        Object.keys(luces).length > 0 &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '12px',
                  color: '#1e40af',
                  borderBottom: '2px solid #bfdbfe',
                  paddingBottom: '8px',
                },
              },
              '💡 Luces, Bocina y Sirena'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                },
              },
              lucesConfig.map(function (lc) {
                var val = luces[lc.key];
                if (!val) return null;
                return React.createElement(
                  'div',
                  {
                    key: lc.key,
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background:
                        val.ok === true
                          ? '#f0fdf4'
                          : val.ok === false
                          ? '#fef2f2'
                          : '#f9fafb',
                      borderRadius: '8px',
                      border:
                        '1px solid ' +
                        (val.ok === true
                          ? '#bbf7d0'
                          : val.ok === false
                          ? '#fecaca'
                          : '#e5e7eb'),
                    },
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'p',
                      { style: { fontWeight: '600', fontSize: '13px' } },
                      lc.label
                    ),
                    val.observaciones &&
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic',
                          },
                        },
                        val.observaciones
                      )
                  ),
                  renderEstadoBadge(val.ok)
                );
              })
            )
          ),

        Object.keys(items).length > 0 &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '12px',
                  color: '#374151',
                  borderBottom: '2px solid #e5e7eb',
                  paddingBottom: '8px',
                },
              },
              '🔧 Herramientas e Items'
            ),
            React.createElement(
              'div',
              {
                style: { display: 'flex', flexDirection: 'column', gap: '8px' },
              },
              Object.entries(items).map(function (entry) {
                var itemId = entry[0];
                var item = entry[1];
                return React.createElement(
                  'div',
                  {
                    key: itemId,
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background:
                        item.ok === true
                          ? '#f0fdf4'
                          : item.ok === false
                          ? '#fef2f2'
                          : '#f9fafb',
                      borderRadius: '8px',
                      border:
                        '1px solid ' +
                        (item.ok === true
                          ? '#bbf7d0'
                          : item.ok === false
                          ? '#fecaca'
                          : '#e5e7eb'),
                    },
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'p',
                      { style: { fontWeight: '600', fontSize: '13px' } },
                      item.nombre
                    ),
                    React.createElement(
                      'p',
                      { style: { fontSize: '11px', color: '#6b7280' } },
                      '📍 ' +
                        item.ubicacion +
                        ' · Esperado: ' +
                        item.cantidadEsperada +
                        ' ' +
                        (item.unidad || 'u') +
                        ' · Real: ' +
                        (item.cantidadReal || 0) +
                        ' ' +
                        (item.unidad || 'u')
                    ),
                    item.observaciones &&
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic',
                          },
                        },
                        item.observaciones
                      )
                  ),
                  renderEstadoBadge(item.ok)
                );
              })
            )
          ),

        Object.keys(eras).length > 0 &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '12px',
                  color: '#7c3aed',
                  borderBottom: '2px solid #ddd6fe',
                  paddingBottom: '8px',
                },
              },
              '🎽 ERAs'
            ),
            React.createElement(
              'div',
              {
                style: { display: 'flex', flexDirection: 'column', gap: '8px' },
              },
              Object.entries(eras).map(function (entry) {
                var eraId = entry[0];
                var era = entry[1];
                return React.createElement(
                  'div',
                  {
                    key: eraId,
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background:
                        era.ok === true
                          ? '#f0fdf4'
                          : era.ok === false
                          ? '#fef2f2'
                          : '#f9fafb',
                      borderRadius: '8px',
                      border:
                        '1px solid ' +
                        (era.ok === true
                          ? '#bbf7d0'
                          : era.ok === false
                          ? '#fecaca'
                          : '#e5e7eb'),
                    },
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'p',
                      { style: { fontWeight: '600', fontSize: '13px' } },
                      '🎽 ' + era.nombre
                    ),
                    React.createElement(
                      'p',
                      { style: { fontSize: '11px', color: '#6b7280' } },
                      '🔖 ' +
                        era.serial +
                        (era.codigoInterno
                          ? ' · 🏷️ ' + era.codigoInterno
                          : '') +
                        ' · Presión: ' +
                        (era.presionReal || 0) +
                        ' / ' +
                        era.presionEsperada +
                        ' bar'
                    ),
                    era.observaciones &&
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic',
                          },
                        },
                        era.observaciones
                      )
                  ),
                  renderEstadoBadge(era.ok)
                );
              })
            )
          )
      )
    );
  };

  if (vista === 'lista') {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          },
        },
        React.createElement('h2', { style: styles.pageTitle }, '📋 Checklists'),
        React.createElement(
          'button',
          {
            style: styles.btnPrimary,
            onClick: function () {
              setVista('nuevo');
            },
          },
          '➕ Nuevo Checklist'
        )
      ),

      checklistDetalle && renderDetalleChecklist(checklistDetalle),

      props.checklists.length === 0
        ? React.createElement(
            'div',
            {
              style: Object.assign({}, styles.card, {
                textAlign: 'center',
                padding: '60px',
              }),
            },
            React.createElement(
              'div',
              { style: { fontSize: '64px', marginBottom: '16px' } },
              '📋'
            ),
            React.createElement(
              'h3',
              { style: { color: '#6b7280' } },
              'No hay checklists registrados'
            )
          )
        : React.createElement(
            'div',
            {
              style: { display: 'flex', flexDirection: 'column', gap: '10px' },
            },
            props.checklists.map(function (cl) {
              var fluidos = cl.fluidos || {};
              var luces = cl.luces || {};
              var items = cl.items || {};
              var eras = cl.eras || {};

              var contarOk = function (obj) {
                return Object.values(obj).filter(function (v) {
                  return v.ok === true;
                }).length;
              };
              var contarNok = function (obj) {
                return Object.values(obj).filter(function (v) {
                  return v.ok === false;
                }).length;
              };
              var contarTotal = function (obj) {
                return Object.values(obj).length;
              };

              var totalOk =
                contarOk(fluidos) +
                contarOk(luces) +
                contarOk(items) +
                contarOk(eras);
              var totalNok =
                contarNok(fluidos) +
                contarNok(luces) +
                contarNok(items) +
                contarNok(eras);
              var totalItems =
                contarTotal(fluidos) +
                contarTotal(luces) +
                contarTotal(items) +
                contarTotal(eras);

              return React.createElement(
                'div',
                {
                  key: cl.id,
                  style: Object.assign({}, styles.card, {
                    border:
                      '2px solid ' +
                      (cl.resultado === 'ok' ? '#bbf7d0' : '#fecaca'),
                    background: cl.resultado === 'ok' ? '#f0fdf4' : '#fef2f2',
                    marginBottom: '0',
                    cursor: 'pointer',
                  }),
                  onClick: function () {
                    setChecklistDetalle(cl);
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '10px',
                    },
                  },
                  React.createElement(
                    'div',
                    { style: { flex: 1 } },
                    React.createElement(
                      'h3',
                      {
                        style: {
                          fontWeight: 'bold',
                          fontSize: '15px',
                          marginBottom: '6px',
                        },
                      },
                      '🚛 ' + cl.vehiculoNombre
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '8px',
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontSize: '12px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                          },
                        },
                        cl.tipo === 'completo'
                          ? '📋 Completo'
                          : cl.tipo === 'fluidos'
                          ? '🛢️ Fluidos'
                          : cl.tipo === 'herramientas'
                          ? '🔧 Herramientas'
                          : '🎽 ERAs'
                      ),
                      React.createElement(
                        'span',
                        { style: { fontSize: '12px', color: '#6b7280' } },
                        '📅 ' + (cl.fecha || '-') + ' ' + (cl.hora || '')
                      ),
                      React.createElement(
                        'span',
                        { style: { fontSize: '12px', color: '#6b7280' } },
                        '👤 ' + (cl.usuario || '-')
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap',
                        },
                      },
                      totalItems > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#f3f4f6',
                              color: '#374151',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            },
                          },
                          '📊 Total: ' + totalItems + ' items'
                        ),
                      totalOk > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#d1fae5',
                              color: '#065f46',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '✅ OK: ' + totalOk
                        ),
                      totalNok > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            },
                          },
                          '❌ NOK: ' + totalNok
                        ),
                      Object.keys(fluidos).length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            },
                          },
                          '🛢️ Fluidos: ' +
                            contarOk(fluidos) +
                            '/' +
                            contarTotal(fluidos)
                        ),
                      Object.keys(luces).length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            },
                          },
                          '💡 Luces: ' +
                            contarOk(luces) +
                            '/' +
                            contarTotal(luces)
                        ),
                      Object.keys(items).length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#f3f4f6',
                              color: '#374151',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            },
                          },
                          '🔧 Items: ' +
                            contarOk(items) +
                            '/' +
                            contarTotal(items)
                        ),
                      Object.keys(eras).length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '12px',
                              background: '#ede9fe',
                              color: '#7c3aed',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            },
                          },
                          '🎽 ERAs: ' + contarOk(eras) + '/' + contarTotal(eras)
                        )
                    ),
                    cl.observaciones &&
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '6px',
                            fontStyle: 'italic',
                          },
                        },
                        '💬 ' + cl.observaciones
                      )
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      },
                    },
                    React.createElement(
                      'div',
                      { style: { textAlign: 'center' } },
                      React.createElement(
                        'div',
                        { style: { fontSize: '32px' } },
                        cl.resultado === 'ok' ? '✅' : '⚠️'
                      ),
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            marginTop: '2px',
                          },
                        },
                        cl.resultado === 'ok' ? 'APROBADO' : 'CON NOVEDADES'
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        },
                      },
                      React.createElement(
                        'button',
                        {
                          style: {
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          },
                          onClick: function (e) {
                            e.stopPropagation();
                            setChecklistDetalle(cl);
                          },
                        },
                        '👁️ Ver Detalle'
                      ),
                      React.createElement(
                        'button',
                        {
                          style: {
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          },
                          onClick: function (e) {
                            e.stopPropagation();
                            if (window.confirm('¿Eliminar este checklist?')) {
                              props.onEliminar(cl.id);
                            }
                          },
                        },
                        '🗑️ Eliminar'
                      )
                    )
                  )
                )
              );
            })
          )
    );
  }

  if (vista === 'nuevo') {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          },
        },
        React.createElement(
          'h2',
          { style: styles.pageTitle },
          '📋 Nuevo Checklist'
        ),
        React.createElement(
          'button',
          {
            style: Object.assign({}, styles.btnPrimary, {
              background: '#6b7280',
            }),
            onClick: function () {
              setVista('lista');
              setVehiculoSel(null);
            },
          },
          '✖ Cancelar'
        )
      ),

      !vehiculoSel
        ? React.createElement(
            'div',
            { style: styles.card },
            React.createElement(
              'h3',
              { style: styles.cardTitle },
              '1️⃣ Seleccionar Móvil'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                },
              },
              props.vehiculos.map(function (v) {
                return React.createElement(
                  'button',
                  {
                    key: v.id,
                    style: {
                      padding: '20px',
                      background:
                        v.estado === 'operativo' ? '#f0fdf4' : '#fef3c7',
                      border:
                        '2px solid ' +
                        (v.estado === 'operativo' ? '#bbf7d0' : '#fde68a'),
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    },
                    onClick: function () {
                      setVehiculoSel(v);
                    },
                  },
                  React.createElement(
                    'div',
                    { style: { fontSize: '36px', marginBottom: '8px' } },
                    '🚛'
                  ),
                  React.createElement(
                    'p',
                    { style: { fontWeight: 'bold', fontSize: '14px' } },
                    v.nombre
                  ),
                  React.createElement(
                    'p',
                    { style: { fontSize: '12px', color: '#6b7280' } },
                    v.tipo
                  )
                );
              })
            )
          )
        : React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              {
                style: Object.assign({}, styles.card, {
                  background: '#f0f9ff',
                  border: '2px solid #0ea5e9',
                  marginBottom: '16px',
                }),
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                },
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'h3',
                    { style: { fontWeight: 'bold', fontSize: '16px' } },
                    '🚛 ' + vehiculoSel.nombre
                  ),
                  React.createElement(
                    'p',
                    { style: { fontSize: '13px', color: '#6b7280' } },
                    vehiculoSel.tipo
                  )
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      padding: '6px 12px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    },
                    onClick: function () {
                      setVehiculoSel(null);
                    },
                  },
                  '↩️ Cambiar'
                )
              )
            ),

            React.createElement(
              'div',
              {
                style: Object.assign({}, styles.card, { marginBottom: '16px' }),
              },
              React.createElement(
                'h3',
                { style: styles.cardTitle },
                '2️⃣ Tipo de Checklist'
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
                [
                  { key: 'completo', label: '📋 Completo' },
                  { key: 'fluidos', label: '🛢️ Fluidos y Luces' },
                  { key: 'herramientas', label: '🔧 Herramientas' },
                  { key: 'eras', label: '🎽 ERAs' },
                ].map(function (t) {
                  return React.createElement(
                    'button',
                    {
                      key: t.key,
                      style: {
                        flex: 1,
                        padding: '12px',
                        background: tipo === t.key ? '#2563eb' : '#f3f4f6',
                        color: tipo === t.key ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: tipo === t.key ? '700' : '500',
                        minWidth: '120px',
                      },
                      onClick: function () {
                        setTipo(t.key);
                      },
                    },
                    t.label
                  );
                })
              )
            ),

            (tipo === 'fluidos' || tipo === 'completo') &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '16px',
                      color: '#92400e',
                    },
                  },
                  '🛢️ Control de Fluidos'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    },
                  },
                  fluidosConfig.map(function (fc) {
                    var val = estadoFluidos[fc.key] || {
                      ok: null,
                      observaciones: '',
                    };
                    return React.createElement(
                      'div',
                      {
                        key: fc.key,
                        style: {
                          padding: '14px',
                          background:
                            val.ok === true
                              ? '#f0fdf4'
                              : val.ok === false
                              ? '#fef2f2'
                              : '#f9fafb',
                          borderRadius: '10px',
                          border:
                            '1px solid ' +
                            (val.ok === true
                              ? '#bbf7d0'
                              : val.ok === false
                              ? '#fecaca'
                              : '#e5e7eb'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          },
                        },
                        React.createElement(
                          'p',
                          { style: { fontWeight: '600', fontSize: '14px' } },
                          fc.label
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '8px' } },
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '6px 16px',
                                background:
                                  val.ok === true ? '#10b981' : '#e5e7eb',
                                color: val.ok === true ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                var f = Object.assign({}, estadoFluidos);
                                f[fc.key] = Object.assign({}, val, {
                                  ok: true,
                                });
                                setEstadoFluidos(f);
                              },
                            },
                            '✓ OK'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '6px 16px',
                                background:
                                  val.ok === false ? '#ef4444' : '#e5e7eb',
                                color: val.ok === false ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                var f = Object.assign({}, estadoFluidos);
                                f[fc.key] = Object.assign({}, val, {
                                  ok: false,
                                });
                                setEstadoFluidos(f);
                              },
                            },
                            '✗ NOK'
                          )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: val.observaciones || '',
                        onChange: function (e) {
                          var f = Object.assign({}, estadoFluidos);
                          f[fc.key] = Object.assign({}, val, {
                            observaciones: e.target.value,
                          });
                          setEstadoFluidos(f);
                        },
                        style: {
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        },
                      })
                    );
                  })
                )
              ),

            (tipo === 'fluidos' || tipo === 'completo') &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '16px',
                      color: '#1e40af',
                    },
                  },
                  '💡 Control de Luces, Bocina y Sirena'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    },
                  },
                  lucesConfig.map(function (lc) {
                    var val = estadoLuces[lc.key] || {
                      ok: null,
                      observaciones: '',
                    };
                    return React.createElement(
                      'div',
                      {
                        key: lc.key,
                        style: {
                          padding: '14px',
                          background:
                            val.ok === true
                              ? '#f0fdf4'
                              : val.ok === false
                              ? '#fef2f2'
                              : '#f9fafb',
                          borderRadius: '10px',
                          border:
                            '1px solid ' +
                            (val.ok === true
                              ? '#bbf7d0'
                              : val.ok === false
                              ? '#fecaca'
                              : '#e5e7eb'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          },
                        },
                        React.createElement(
                          'p',
                          { style: { fontWeight: '600', fontSize: '14px' } },
                          lc.label
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '8px' } },
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '6px 16px',
                                background:
                                  val.ok === true ? '#10b981' : '#e5e7eb',
                                color: val.ok === true ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                var l = Object.assign({}, estadoLuces);
                                l[lc.key] = Object.assign({}, val, {
                                  ok: true,
                                });
                                setEstadoLuces(l);
                              },
                            },
                            '✓ OK'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '6px 16px',
                                background:
                                  val.ok === false ? '#ef4444' : '#e5e7eb',
                                color: val.ok === false ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                              },
                              onClick: function () {
                                var l = Object.assign({}, estadoLuces);
                                l[lc.key] = Object.assign({}, val, {
                                  ok: false,
                                });
                                setEstadoLuces(l);
                              },
                            },
                            '✗ NOK'
                          )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: val.observaciones || '',
                        onChange: function (e) {
                          var l = Object.assign({}, estadoLuces);
                          l[lc.key] = Object.assign({}, val, {
                            observaciones: e.target.value,
                          });
                          setEstadoLuces(l);
                        },
                        style: {
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        },
                      })
                    );
                  })
                )
              ),

            (tipo === 'herramientas' || tipo === 'completo') &&
              Object.keys(estadoItems).length > 0 &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '16px',
                      color: '#374151',
                    },
                  },
                  '🔧 Control de Herramientas e Items'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    },
                  },
                  Object.entries(estadoItems).map(function (entry) {
                    var itemId = entry[0];
                    var item = entry[1];
                    return React.createElement(
                      'div',
                      {
                        key: itemId,
                        style: {
                          padding: '14px',
                          background:
                            item.ok === true
                              ? '#f0fdf4'
                              : item.ok === false
                              ? '#fef2f2'
                              : '#f9fafb',
                          borderRadius: '10px',
                          border:
                            '1px solid ' +
                            (item.ok === true
                              ? '#bbf7d0'
                              : item.ok === false
                              ? '#fecaca'
                              : '#e5e7eb'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'p',
                            { style: { fontWeight: '600', fontSize: '14px' } },
                            item.nombre
                          ),
                          React.createElement(
                            'p',
                            { style: { fontSize: '12px', color: '#6b7280' } },
                            '📍 ' +
                              item.ubicacion +
                              ' · Esperado: ' +
                              item.cantidadEsperada +
                              ' ' +
                              item.unidad
                          )
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement('input', {
                            type: 'number',
                            value: item.cantidadReal || 0,
                            onChange: function (e) {
                              var it = Object.assign({}, estadoItems);
                              it[itemId] = Object.assign({}, item, {
                                cantidadReal: parseInt(e.target.value) || 0,
                                ok:
                                  parseInt(e.target.value) >=
                                  item.cantidadEsperada,
                              });
                              setEstadoItems(it);
                            },
                            style: {
                              width: '70px',
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              textAlign: 'center',
                            },
                            min: '0',
                          }),
                          React.createElement(
                            'span',
                            { style: { fontSize: '13px', color: '#6b7280' } },
                            '/ ' + item.cantidadEsperada + ' ' + item.unidad
                          ),
                          item.ok === true &&
                            React.createElement(
                              'span',
                              { style: { color: '#10b981', fontSize: '20px' } },
                              '✅'
                            ),
                          item.ok === false &&
                            React.createElement(
                              'span',
                              { style: { color: '#ef4444', fontSize: '20px' } },
                              '❌'
                            )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: item.observaciones || '',
                        onChange: function (e) {
                          var it = Object.assign({}, estadoItems);
                          it[itemId] = Object.assign({}, item, {
                            observaciones: e.target.value,
                          });
                          setEstadoItems(it);
                        },
                        style: {
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        },
                      })
                    );
                  })
                )
              ),

            (tipo === 'herramientas' || tipo === 'completo') &&
              Object.keys(estadoItems).length === 0 &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                    textAlign: 'center',
                    padding: '30px',
                  }),
                },
                React.createElement(
                  'p',
                  { style: { fontSize: '40px', marginBottom: '8px' } },
                  '🔧'
                ),
                React.createElement(
                  'p',
                  { style: { color: '#6b7280', fontSize: '14px' } },
                  'Este móvil no tiene items asignados en compartimientos'
                )
              ),

            (tipo === 'eras' || tipo === 'completo') &&
              Object.keys(estadoERAs).length > 0 &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '16px',
                      color: '#7c3aed',
                    },
                  },
                  '🎽 Control de ERAs'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    },
                  },
                  Object.entries(estadoERAs).map(function (entry) {
                    var eraId = entry[0];
                    var era = entry[1];
                    return React.createElement(
                      'div',
                      {
                        key: eraId,
                        style: {
                          padding: '14px',
                          background:
                            era.ok === true
                              ? '#f0fdf4'
                              : era.ok === false
                              ? '#fef2f2'
                              : '#f9fafb',
                          borderRadius: '10px',
                          border:
                            '1px solid ' +
                            (era.ok === true
                              ? '#bbf7d0'
                              : era.ok === false
                              ? '#fecaca'
                              : '#e5e7eb'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'p',
                            { style: { fontWeight: '600', fontSize: '14px' } },
                            '🎽 ' + era.nombre
                          ),
                          React.createElement(
                            'p',
                            { style: { fontSize: '12px', color: '#6b7280' } },
                            '🔖 ' +
                              era.serial +
                              (era.codigoInterno
                                ? ' · 🏷️ ' + era.codigoInterno
                                : '') +
                              ' · Presión esperada: ' +
                              era.presionEsperada +
                              ' bar'
                          )
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center',
                            },
                          },
                          React.createElement('input', {
                            type: 'number',
                            value: era.presionReal || 0,
                            onChange: function (e) {
                              var er = Object.assign({}, estadoERAs);
                              er[eraId] = Object.assign({}, era, {
                                presionReal: parseInt(e.target.value) || 0,
                                ok:
                                  parseInt(e.target.value) >=
                                  era.presionEsperada * 0.9,
                              });
                              setEstadoERAs(er);
                            },
                            style: {
                              width: '80px',
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              textAlign: 'center',
                            },
                            min: '0',
                            max: '300',
                          }),
                          React.createElement(
                            'span',
                            { style: { fontSize: '13px', color: '#6b7280' } },
                            'bar'
                          ),
                          era.ok === true &&
                            React.createElement(
                              'span',
                              { style: { color: '#10b981', fontSize: '20px' } },
                              '✅'
                            ),
                          era.ok === false &&
                            React.createElement(
                              'span',
                              { style: { color: '#ef4444', fontSize: '20px' } },
                              '❌'
                            )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: era.observaciones || '',
                        onChange: function (e) {
                          var er = Object.assign({}, estadoERAs);
                          er[eraId] = Object.assign({}, era, {
                            observaciones: e.target.value,
                          });
                          setEstadoERAs(er);
                        },
                        style: {
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        },
                      })
                    );
                  })
                )
              ),

            (tipo === 'eras' || tipo === 'completo') &&
              Object.keys(estadoERAs).length === 0 &&
              React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    marginBottom: '16px',
                    textAlign: 'center',
                    padding: '30px',
                  }),
                },
                React.createElement(
                  'p',
                  { style: { fontSize: '40px', marginBottom: '8px' } },
                  '🎽'
                ),
                React.createElement(
                  'p',
                  { style: { color: '#6b7280', fontSize: '14px' } },
                  'Este móvil no tiene ERAs asignadas'
                )
              ),

            React.createElement(
              'div',
              {
                style: Object.assign({}, styles.card, { marginBottom: '16px' }),
              },
              React.createElement(
                'label',
                { style: styles.label },
                '💬 Observaciones Generales'
              ),
              React.createElement('textarea', {
                value: obs,
                onChange: function (e) {
                  setObs(e.target.value);
                },
                style: Object.assign({}, styles.input, {
                  minHeight: '80px',
                  resize: 'vertical',
                }),
                placeholder: 'Observaciones generales del checklist...',
              })
            ),

            React.createElement(
              'button',
              {
                style: {
                  width: '100%',
                  padding: '16px',
                  background: guardando ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                },
                onClick: guardar,
                disabled: guardando,
              },
              guardando ? '⏳ Guardando...' : '✅ Guardar Checklist'
            )
          )
    );
  }

  return null;
}
function Panel(props) {
  var kpis = [
    {
      label: 'Móviles',
      valor: props.vehiculos.length,
      icon: '🚛',
      color: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
      sub:
        props.vehiculos.filter(function (v) {
          return v.estado === 'operativo';
        }).length + ' operativos',
    },
    {
      label: 'ERAs',
      valor: props.eras.length,
      icon: '🎽',
      color: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      sub:
        props.eras.filter(function (e) {
          return e.estado === 'activo';
        }).length + ' activas',
    },
    {
      label: 'Personal',
      valor: props.personal.length,
      icon: '👥',
      color: 'linear-gradient(135deg, #059669, #047857)',
      sub:
        props.personal.filter(function (p) {
          return p.estado === 'activo';
        }).length + ' activos',
    },
    {
      label: 'Inventario',
      valor: props.inventario.length,
      icon: '📦',
      color: 'linear-gradient(135deg, #d97706, #b45309)',
      sub: props.itemsBajoStock.length + ' bajo stock',
    },
    {
      label: 'Equipos',
      valor: props.equipos.length,
      icon: '🧯',
      color: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      sub:
        props.equipos.filter(function (e) {
          return e.estado === 'operativo';
        }).length + ' operativos',
    },
    {
      label: 'Checklists',
      valor: props.checklists.length,
      icon: '📋',
      color: 'linear-gradient(135deg, #0891b2, #0e7490)',
      sub: 'controles realizados',
    },
  ];

  var alertas = [];

  props.vehiculos.forEach(function (v) {
    if (v.vtv && v.vtv.vencimiento) {
      var dias = Math.ceil(
        (new Date(v.vtv.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          tipo: 'error',
          msg:
            '🚗 VTV vencida: ' +
            v.nombre +
            ' (hace ' +
            Math.abs(dias) +
            ' días)',
        });
      else if (dias <= 30)
        alertas.push({
          tipo: 'warn',
          msg: '🚗 VTV próxima: ' + v.nombre + ' (' + dias + ' días)',
        });
    }
  });

  props.eras.forEach(function (era) {
    if (era.vencimientoTubo) {
      var dias = Math.ceil(
        (new Date(era.vencimientoTubo) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          tipo: 'error',
          msg:
            '🎽 Tubo ERA vencido: ' +
            (era.codigoInterno || era.serial) +
            ' - ' +
            era.marca +
            ' ' +
            era.modelo,
        });
      else if (dias <= 30)
        alertas.push({
          tipo: 'warn',
          msg:
            '🎽 Tubo ERA próximo: ' +
            (era.codigoInterno || era.serial) +
            ' (' +
            dias +
            ' días)',
        });
    }
    if (era.pruebaHidraulica) {
      var diasPH = Math.ceil(
        (new Date(era.pruebaHidraulica) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (diasPH < 0)
        alertas.push({
          tipo: 'error',
          msg: '🔧 PH ERA vencida: ' + (era.codigoInterno || era.serial),
        });
    }
  });

  props.personal.forEach(function (p) {
    var lic = p.licencia || {};
    if (lic.vencimiento) {
      var dias = Math.ceil(
        (new Date(lic.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          tipo: 'error',
          msg:
            '🪪 Licencia vencida: ' +
            p.nombre +
            ' ' +
            (p.apellido || '') +
            ' (Cat. ' +
            lic.categoria +
            ')',
        });
      else if (dias <= 60)
        alertas.push({
          tipo: 'warn',
          msg:
            '🪪 Licencia próxima: ' +
            p.nombre +
            ' ' +
            (p.apellido || '') +
            ' (' +
            dias +
            ' días)',
        });
    }
  });

  props.itemsBajoStock.forEach(function (i) {
    alertas.push({
      tipo: 'warn',
      msg:
        '📦 Stock bajo: ' +
        (i.codigoInterno ? '[' + i.codigoInterno + '] ' : '') +
        i.nombre +
        ' (' +
        (i.stock || 0) +
        ' ' +
        (i.unidad || 'u') +
        ')',
    });
  });

  props.equipos.forEach(function (eq) {
    if (eq.vencimiento) {
      var dias = Math.ceil(
        (new Date(eq.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          tipo: 'error',
          msg:
            '🧯 Equipo vencido: ' +
            (eq.codigoInterno ? '[' + eq.codigoInterno + '] ' : '') +
            eq.nombre,
        });
      else if (dias <= 30)
        alertas.push({
          tipo: 'warn',
          msg:
            '🧯 Equipo próximo: ' +
            (eq.codigoInterno ? '[' + eq.codigoInterno + '] ' : '') +
            eq.nombre +
            ' (' +
            dias +
            ' días)',
        });
    }
  });

  var errores = alertas.filter(function (a) {
    return a.tipo === 'error';
  });
  var warnings = alertas.filter(function (a) {
    return a.tipo === 'warn';
  });

  return React.createElement(
    'div',
    null,
    React.createElement(
      'h2',
      { style: Object.assign({}, styles.pageTitle, { marginBottom: '24px' }) },
      '🏠 Panel de Control'
    ),
    React.createElement(
      'div',
      { style: styles.grid },
      kpis.map(function (k) {
        return React.createElement(
          'div',
          {
            key: k.label,
            style: Object.assign({}, styles.kpi, { background: k.color }),
          },
          React.createElement(
            'div',
            { style: { fontSize: '36px', marginBottom: '8px' } },
            k.icon
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '4px',
              },
            },
            k.valor
          ),
          React.createElement(
            'div',
            { style: { fontSize: '14px', opacity: 0.9, marginBottom: '4px' } },
            k.label
          ),
          React.createElement(
            'div',
            { style: { fontSize: '12px', opacity: 0.75 } },
            k.sub
          )
        );
      })
    ),

    errores.length > 0 &&
      React.createElement(
        'div',
        {
          style: {
            background: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          },
        },
        React.createElement(
          'h3',
          {
            style: {
              fontWeight: 'bold',
              color: '#991b1b',
              marginBottom: '12px',
            },
          },
          '❌ Alertas Críticas (' + errores.length + ')'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          errores.map(function (a, i) {
            return React.createElement(
              'div',
              {
                key: i,
                style: {
                  padding: '8px 12px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#991b1b',
                },
              },
              a.msg
            );
          })
        )
      ),

    warnings.length > 0 &&
      React.createElement(
        'div',
        {
          style: {
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          },
        },
        React.createElement(
          'h3',
          {
            style: {
              fontWeight: 'bold',
              color: '#92400e',
              marginBottom: '12px',
            },
          },
          '⚠️ Advertencias (' + warnings.length + ')'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          warnings.map(function (a, i) {
            return React.createElement(
              'div',
              {
                key: i,
                style: {
                  padding: '8px 12px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#92400e',
                },
              },
              a.msg
            );
          })
        )
      ),

    React.createElement(
      'div',
      {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
      },
      React.createElement(
        'div',
        { style: styles.card },
        React.createElement(
          'h3',
          {
            style: Object.assign({}, styles.cardTitle, {
              marginBottom: '16px',
            }),
          },
          '🚛 Estado de Móviles'
        ),
        props.vehiculos.length === 0
          ? React.createElement(
              'p',
              {
                style: {
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '20px',
                },
              },
              'No hay móviles'
            )
          : React.createElement(
              'div',
              {
                style: { display: 'flex', flexDirection: 'column', gap: '8px' },
              },
              props.vehiculos.map(function (v) {
                return React.createElement(
                  'div',
                  {
                    key: v.id,
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      },
                    },
                    React.createElement(
                      'span',
                      { style: { fontSize: '20px' } },
                      '🚛'
                    ),
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'p',
                        { style: { fontWeight: '600', fontSize: '14px' } },
                        v.nombre
                      ),
                      React.createElement(
                        'p',
                        { style: { fontSize: '12px', color: '#6b7280' } },
                        v.tipo + (v.patente ? ' · ' + v.patente : '')
                      )
                    )
                  ),
                  React.createElement(
                    'span',
                    {
                      style:
                        v.estado === 'operativo'
                          ? styles.badgeOk
                          : styles.badgeWarn,
                    },
                    v.estado === 'operativo' ? '✓ OK' : '🔧 MANT.'
                  )
                );
              })
            )
      ),

      React.createElement(
        'div',
        { style: styles.card },
        React.createElement(
          'h3',
          {
            style: Object.assign({}, styles.cardTitle, {
              marginBottom: '16px',
            }),
          },
          '📋 Últimos Checklists'
        ),
        props.checklists.length === 0
          ? React.createElement(
              'p',
              {
                style: {
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '20px',
                },
              },
              'No hay checklists'
            )
          : React.createElement(
              'div',
              {
                style: { display: 'flex', flexDirection: 'column', gap: '8px' },
              },
              props.checklists.slice(0, 5).map(function (cl) {
                return React.createElement(
                  'div',
                  {
                    key: cl.id,
                    style: {
                      padding: '10px 14px',
                      background: cl.resultado === 'ok' ? '#f0fdf4' : '#fef2f2',
                      borderRadius: '8px',
                      border:
                        '1px solid ' +
                        (cl.resultado === 'ok' ? '#bbf7d0' : '#fecaca'),
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                    },
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'p',
                        { style: { fontWeight: '600', fontSize: '13px' } },
                        cl.vehiculoNombre +
                          ' - ' +
                          (cl.tipo === 'fluidos'
                            ? '🛢️'
                            : cl.tipo === 'herramientas'
                            ? '🔧'
                            : cl.tipo === 'eras'
                            ? '🎽'
                            : '📋') +
                          ' ' +
                          cl.tipo
                      ),
                      React.createElement(
                        'p',
                        { style: { fontSize: '11px', color: '#6b7280' } },
                        '👤 ' +
                          (cl.usuario || '-') +
                          ' · 📅 ' +
                          (cl.fecha || '-')
                      )
                    ),
                    React.createElement(
                      'span',
                      { style: { fontSize: '18px' } },
                      cl.resultado === 'ok' ? '✅' : '⚠️'
                    )
                  )
                );
              })
            )
      )
    )
  );
}

function Login(props) {
  var emailState = useState('');
  var email = emailState[0];
  var setEmail = emailState[1];
  var passState = useState('');
  var pass = passState[0];
  var setPass = passState[1];

  var handleSubmit = function (e) {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) {
      alert('Completá todos los campos');
      return;
    }
    props.onLogin(email, pass);
  };

  return React.createElement(
    'div',
    {
      style: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #dc2626 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          background: 'white',
          borderRadius: '20px',
          padding: '48px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        },
      },
      React.createElement(
        'div',
        { style: { textAlign: 'center', marginBottom: '32px' } },
        React.createElement(
          'div',
          { style: { fontSize: '64px', marginBottom: '16px' } },
          '🚒'
        ),
        React.createElement(
          'h1',
          {
            style: {
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#1e3a5f',
              marginBottom: '8px',
            },
          },
          'Bomberos Ramallo'
        ),
        React.createElement(
          'p',
          { style: { color: '#6b7280', fontSize: '14px' } },
          'Sistema de Gestión Integral'
        )
      ),
      React.createElement(
        'form',
        { onSubmit: handleSubmit },
        React.createElement(
          'div',
          { style: { marginBottom: '16px' } },
          React.createElement(
            'label',
            { style: styles.label },
            'Usuario / Email'
          ),
          React.createElement('input', {
            type: 'text',
            value: email,
            onChange: function (e) {
              setEmail(e.target.value);
            },
            style: Object.assign({}, styles.input, {
              padding: '14px',
              fontSize: '15px',
            }),
            placeholder: 'usuario@bomberos.com',
            autoComplete: 'username',
          })
        ),
        React.createElement(
          'div',
          { style: { marginBottom: '24px' } },
          React.createElement('label', { style: styles.label }, 'Contraseña'),
          React.createElement('input', {
            type: 'password',
            value: pass,
            onChange: function (e) {
              setPass(e.target.value);
            },
            style: Object.assign({}, styles.input, {
              padding: '14px',
              fontSize: '15px',
            }),
            placeholder: '••••••••',
            autoComplete: 'current-password',
          })
        ),
        React.createElement(
          'button',
          {
            type: 'submit',
            style: {
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #1e3a5f, #dc2626)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              letterSpacing: '0.5px',
            },
          },
          '🔐 Ingresar al Sistema'
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            marginTop: '24px',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '10px',
            textAlign: 'center',
          },
        },
        React.createElement(
          'p',
          {
            style: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' },
          },
          '💡 Ingresá con tu email institucional'
        ),
        React.createElement(
          'p',
          { style: { fontSize: '11px', color: '#9ca3af' } },
          'El nombre de usuario se tomará del email'
        )
      )
    )
  );
}

export default App;

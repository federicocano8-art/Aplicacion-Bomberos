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

  return {
    data: data,
    loading: loading,
    error: error,
    agregar: agregar,
    actualizar: actualizar,
    eliminar: eliminar,
  };
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

// ============================================
// APP PRINCIPAL
// ============================================
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

  // Gestión de compartimientos
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
      vista === 'panel' &&
        React.createElement(Panel, {
          vehiculos: vehiculosCol.data,
          eras: erasCol.data,
          checklists: checklistsCol.data,
          personal: personalCol.data,
          bitacora: bitacoraCol.data,
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
          onAgregar: async function (datos) {
            var id = await vehiculosCol.agregar(
              Object.assign({}, datos, {
                erasAsignadas: [],
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
          personal: personalCol.data,
          onAgregar: bitacoraCol.agregar,
          onEliminar: bitacoraCol.eliminar,
        })
    )
  );
}

// ============================================
// VEHICULOS CON COMPARTIMIENTOS
// ============================================
function Vehiculos(props) {
  var estadoInicial = {
    nombre: '',
    tipo: 'Camion Bomba',
    estado: 'operativo',
    chasis: '',
    motor: '',
    patente: '',
    año: '',
    pruebaHidraulica: '',
    vencimiento: '',
    vtv: { apta: true, vencimiento: '', observaciones: '' },
    fluidos: {
      aceite: { ok: true, cantidad: '', observaciones: '' },
      refrigerante: { ok: true, cantidad: '', observaciones: '' },
      combustible: { ok: true, cantidad: '', observaciones: '' },
      liquidoFrenos: { ok: true, cantidad: '', observaciones: '' },
    },
    controles: {
      luces: { ok: true, observaciones: '' },
      lucesEmergencia: { ok: true, observaciones: '' },
      sirena: { ok: true, observaciones: '' },
      bocina: { ok: true, observaciones: '' },
    },
  };

  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var expandidoState = useState(null);
  var expandido = expandidoState[0];
  var setExpandido = expandidoState[1];
  var tabsState = useState({});
  var tabs = tabsState[0];
  var setTabs = tabsState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];

  // Estados para compartimientos
  var nuevoCompNombreState = useState('');
  var nuevoCompNombre = nuevoCompNombreState[0];
  var setNuevoCompNombre = nuevoCompNombreState[1];
  var nuevoSubNombresState = useState({});
  var nuevoSubNombres = nuevoSubNombresState[0];
  var setNuevoSubNombres = nuevoSubNombresState[1];
  var itemSelSubcompState = useState({});
  var itemSelSubcomp = itemSelSubcompState[0];
  var setItemSelSubcomp = itemSelSubcompState[1];
  var cantSelSubcompState = useState({});
  var cantSelSubcomp = cantSelSubcompState[0];
  var setCantSelSubcomp = cantSelSubcompState[1];
  var expandCompState = useState({});
  var expandComp = expandCompState[0];
  var setExpandComp = expandCompState[1];
  var itemAsignarState = useState('');
  var itemAsignar = itemAsignarState[0];
  var setItemAsignar = itemAsignarState[1];
  var cantAsignarState = useState(1);
  var cantAsignar = cantAsignarState[0];
  var setCantAsignar = cantAsignarState[1];
  var eraAsignarState = useState('');
  var eraAsignar = eraAsignarState[0];
  var setEraAsignar = eraAsignarState[1];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var getBorderColor = function (est) {
    return est === 'vencido'
      ? '#ef4444'
      : est === 'proximo'
      ? '#f59e0b'
      : '#d1d5db';
  };
  var getBgColor = function (est) {
    return est === 'vencido'
      ? '#fef2f2'
      : est === 'proximo'
      ? '#fffbeb'
      : 'white';
  };
  var getTab = function (vehiculoId) {
    return tabs[vehiculoId] || 'info';
  };
  var setTab = function (vehiculoId, tab) {
    var t = Object.assign({}, tabs);
    t[vehiculoId] = tab;
    setTabs(t);
  };

  var tabsConfig = [
    { key: 'info', label: '📋 Info' },
    { key: 'fluidos', label: '🛢️ Fluidos' },
    { key: 'compartimientos', label: '🗄️ Compartimientos' },
    { key: 'items', label: '📦 Items' },
    { key: 'eras', label: '🎽 ERAs' },
    { key: 'vtv', label: '🚗 VTV' },
  ];

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      await props.onAgregar(form);
      setForm(estadoInicial);
      setMostrarForm(false);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
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
                placeholder: 'Ej: TB-01',
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
                placeholder: 'ABC-123',
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
                placeholder: '2020',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                {
                  style: Object.assign({}, styles.label, { color: '#dc2626' }),
                },
                '🔩 Chasis *'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.chasis,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { chasis: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Número de chasis',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                {
                  style: Object.assign({}, styles.label, { color: '#dc2626' }),
                },
                '⚙️ Motor *'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.motor,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { motor: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Número de motor',
              })
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
                'Vencimiento General'
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
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                padding: '14px',
                background: guardando ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Agregar Móvil'
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
            var exp = expandido === v.id;
            var tabActual = getTab(v.id);
            var diasVtv = null;
            var vtvEstado = 'sin-datos';
            if (v.vtv && v.vtv.vencimiento) {
              diasVtv = Math.ceil(
                (new Date(v.vtv.vencimiento) - new Date()) /
                  (1000 * 60 * 60 * 24)
              );
              if (!v.vtv.apta || diasVtv < 0) vtvEstado = 'vencida';
              else if (diasVtv <= 30) vtvEstado = 'proxima';
              else vtvEstado = 'apta';
            }
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
            var erasAsignadas = (v.erasAsignadas || [])
              .map(function (eraId) {
                return props.eras.find(function (e) {
                  return e.id === eraId;
                });
              })
              .filter(Boolean);
            var itemsAsignados = v.itemsAsignados || [];
            var compartimientos = v.compartimientos || [];
            var erasDisponibles = props.eras.filter(function (era) {
              return (
                era.estado === 'activo' &&
                !(v.erasAsignadas || []).includes(era.id)
              );
            });
            var totalItemsComps = compartimientos.reduce(function (acc, c) {
              return (
                acc +
                (c.subcompartimientos || []).reduce(function (acc2, s) {
                  return acc2 + (s.items || []).length;
                }, 0)
              );
            }, 0);

            return React.createElement(
              'div',
              { key: v.id, style: styles.card },
              // HEADER DEL VEHICULO
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
                    setExpandido(exp ? null : v.id);
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
                        width: '56px',
                        height: '56px',
                        background:
                          v.estado === 'operativo'
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        flexShrink: 0,
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
                          marginBottom: '2px',
                        },
                      },
                      v.nombre
                    ),
                    React.createElement(
                      'p',
                      { style: { color: '#6b7280', fontSize: '13px' } },
                      v.tipo +
                        (v.patente ? ' · ' + v.patente : '') +
                        (v.año ? ' · ' + v.año : '')
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '6px',
                          marginTop: '4px',
                          flexWrap: 'wrap',
                        },
                      },
                      compartimientos.length > 0 &&
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
                          '🗄️ ' +
                            compartimientos.length +
                            ' comp. / ' +
                            totalItemsComps +
                            ' items'
                        ),
                      erasAsignadas.length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#ede9fe',
                              color: '#7c3aed',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            },
                          },
                          '🎽 ' + erasAsignadas.length + ' ERA(s)'
                        ),
                      itemsAsignados.length > 0 &&
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            },
                          },
                          '📦 ' + itemsAsignados.length + ' item(s)'
                        )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: vtvBg,
                        color: vtvColor,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                      },
                    },
                    vtvEstado === 'apta'
                      ? '🚗 VTV OK'
                      : vtvEstado === 'proxima'
                      ? '🚗 VTV PRÓXIMA'
                      : vtvEstado === 'vencida'
                      ? '🚗 VTV VENCIDA'
                      : '🚗 VTV S/D'
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
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '18px', color: '#6b7280' } },
                    exp ? '▲' : '▼'
                  )
                )
              ),

              exp &&
                React.createElement(
                  'div',
                  { style: { marginTop: '20px' } },
                  // BOTONES ESTADO
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
                          flex: 1,
                          padding: '10px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          props.onActualizar(v.id, { estado: 'operativo' });
                        },
                      },
                      '✅ Operativo'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          flex: 1,
                          padding: '10px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          props.onActualizar(v.id, { estado: 'mantenimiento' });
                        },
                      },
                      '🔧 Mantenimiento'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          flex: 1,
                          padding: '10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        },
                        onClick: function (e) {
                          e.stopPropagation();
                          if (window.confirm('¿Eliminar ' + v.nombre + '?')) {
                            props.onEliminar(v.id);
                          }
                        },
                      },
                      '🗑️ Eliminar'
                    )
                  ),

                  // TABS
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '0',
                        marginBottom: '16px',
                        borderBottom: '2px solid #e5e7eb',
                        overflowX: 'auto',
                      },
                    },
                    tabsConfig.map(function (tab) {
                      return React.createElement(
                        'button',
                        {
                          key: tab.key,
                          style: {
                            padding: '10px 14px',
                            border: 'none',
                            borderBottom:
                              tabActual === tab.key
                                ? '3px solid #2563eb'
                                : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: tabActual === tab.key ? '700' : '500',
                            color:
                              tabActual === tab.key ? '#2563eb' : '#6b7280',
                            cursor: 'pointer',
                            fontSize: '13px',
                            marginBottom: '-2px',
                            whiteSpace: 'nowrap',
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

                  // TAB INFO
                  tabActual === 'info' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
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
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '6px',
                                fontWeight: '600',
                              },
                            },
                            '🔩 Chasis'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: v.chasis || '',
                            onChange: function (e) {
                              props.onActualizar(v.id, {
                                chasis: e.target.value,
                              });
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
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              background: '#f9fafb',
                              padding: '14px',
                              borderRadius: '10px',
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '6px',
                                fontWeight: '600',
                              },
                            },
                            '⚙️ Motor'
                          ),
                          React.createElement('input', {
                            type: 'text',
                            value: v.motor || '',
                            onChange: function (e) {
                              props.onActualizar(v.id, {
                                motor: e.target.value,
                              });
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
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              background: '#f9fafb',
                              padding: '14px',
                              borderRadius: '10px',
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '6px',
                                fontWeight: '600',
                              },
                            },
                            '📅 Prueba Hidráulica'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: v.pruebaHidraulica || '',
                            onChange: function (e) {
                              props.onActualizar(v.id, {
                                pruebaHidraulica: e.target.value,
                              });
                            },
                            style: {
                              width: '100%',
                              padding: '8px',
                              border:
                                '1px solid ' +
                                getBorderColor(
                                  verificarVencimiento(v.pruebaHidraulica)
                                ),
                              borderRadius: '6px',
                              fontSize: '13px',
                              background: getBgColor(
                                verificarVencimiento(v.pruebaHidraulica)
                              ),
                              boxSizing: 'border-box',
                            },
                          }),
                          verificarVencimiento(v.pruebaHidraulica) ===
                            'vencido' &&
                            React.createElement(
                              'p',
                              {
                                style: {
                                  fontSize: '11px',
                                  color: '#dc2626',
                                  marginTop: '4px',
                                  fontWeight: '600',
                                },
                              },
                              '⚠️ VENCIDA'
                            )
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              background: '#f9fafb',
                              padding: '14px',
                              borderRadius: '10px',
                            },
                          },
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '6px',
                                fontWeight: '600',
                              },
                            },
                            '📅 Vencimiento General'
                          ),
                          React.createElement('input', {
                            type: 'date',
                            value: v.vencimiento || '',
                            onChange: function (e) {
                              props.onActualizar(v.id, {
                                vencimiento: e.target.value,
                              });
                            },
                            style: {
                              width: '100%',
                              padding: '8px',
                              border:
                                '1px solid ' +
                                getBorderColor(
                                  verificarVencimiento(v.vencimiento)
                                ),
                              borderRadius: '6px',
                              fontSize: '13px',
                              background: getBgColor(
                                verificarVencimiento(v.vencimiento)
                              ),
                              boxSizing: 'border-box',
                            },
                          }),
                          verificarVencimiento(v.vencimiento) === 'vencido' &&
                            React.createElement(
                              'p',
                              {
                                style: {
                                  fontSize: '11px',
                                  color: '#dc2626',
                                  marginTop: '4px',
                                  fontWeight: '600',
                                },
                              },
                              '⚠️ VENCIDO'
                            )
                        )
                      )
                    ),

                  // TAB FLUIDOS
                  tabActual === 'fluidos' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'h4',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#92400e',
                            marginBottom: '12px',
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
                            gap: '12px',
                            marginBottom: '16px',
                          },
                        },
                        Object.entries(v.fluidos || {}).map(function (entry) {
                          var nombre = entry[0];
                          var fluido = entry[1];
                          var etiquetas = {
                            aceite: '🛢️ Aceite',
                            refrigerante: '🌡️ Refrigerante',
                            combustible: '⛽ Combustible',
                            liquidoFrenos: '🔴 Liq. Frenos',
                          };
                          return React.createElement(
                            'div',
                            {
                              key: nombre,
                              style: {
                                background: fluido.ok ? '#ecfdf5' : '#fee2e2',
                                padding: '12px',
                                borderRadius: '8px',
                                border:
                                  '2px solid ' +
                                  (fluido.ok ? '#a7f3d0' : '#fecaca'),
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
                                'span',
                                {
                                  style: {
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                  },
                                },
                                etiquetas[nombre] || nombre
                              ),
                              React.createElement(
                                'div',
                                { style: { display: 'flex', gap: '4px' } },
                                React.createElement(
                                  'button',
                                  {
                                    style: {
                                      padding: '4px 8px',
                                      background: fluido.ok
                                        ? '#059669'
                                        : '#10b981',
                                      color: 'white',
                                      border: fluido.ok
                                        ? '2px solid #065f46'
                                        : 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var fl = Object.assign({}, v.fluidos);
                                      fl[nombre] = Object.assign(
                                        {},
                                        fl[nombre],
                                        { ok: true }
                                      );
                                      props.onActualizar(v.id, { fluidos: fl });
                                    },
                                  },
                                  '✓ OK'
                                ),
                                React.createElement(
                                  'button',
                                  {
                                    style: {
                                      padding: '4px 8px',
                                      background: !fluido.ok
                                        ? '#b91c1c'
                                        : '#ef4444',
                                      color: 'white',
                                      border: !fluido.ok
                                        ? '2px solid #991b1b'
                                        : 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var fl = Object.assign({}, v.fluidos);
                                      fl[nombre] = Object.assign(
                                        {},
                                        fl[nombre],
                                        { ok: false }
                                      );
                                      props.onActualizar(v.id, { fluidos: fl });
                                    },
                                  },
                                  '✗ NO'
                                )
                              )
                            ),
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Cantidad',
                              value: fluido.cantidad || '',
                              onChange: function (e) {
                                var fl = Object.assign({}, v.fluidos);
                                fl[nombre] = Object.assign({}, fl[nombre], {
                                  cantidad: e.target.value,
                                });
                                props.onActualizar(v.id, { fluidos: fl });
                              },
                              style: {
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                marginBottom: '4px',
                                boxSizing: 'border-box',
                              },
                            }),
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Observaciones',
                              value: fluido.observaciones || '',
                              onChange: function (e) {
                                var fl = Object.assign({}, v.fluidos);
                                fl[nombre] = Object.assign({}, fl[nombre], {
                                  observaciones: e.target.value,
                                });
                                props.onActualizar(v.id, { fluidos: fl });
                              },
                              style: {
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                boxSizing: 'border-box',
                              },
                            })
                          );
                        })
                      ),
                      React.createElement(
                        'h4',
                        {
                          style: {
                            fontWeight: 'bold',
                            color: '#0369a1',
                            marginBottom: '12px',
                          },
                        },
                        '💡 Controles y Señales'
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
                        Object.entries(
                          v.controles || {
                            luces: { ok: true, observaciones: '' },
                            lucesEmergencia: { ok: true, observaciones: '' },
                            sirena: { ok: true, observaciones: '' },
                            bocina: { ok: true, observaciones: '' },
                          }
                        ).map(function (entry) {
                          var nombre = entry[0];
                          var control = entry[1];
                          var etiquetas = {
                            luces: '💡 Luces',
                            lucesEmergencia: '🚨 Luces Emergencia',
                            sirena: '📢 Sirena',
                            bocina: '📯 Bocina',
                          };
                          return React.createElement(
                            'div',
                            {
                              key: nombre,
                              style: {
                                background: control.ok ? '#ecfdf5' : '#fee2e2',
                                padding: '12px',
                                borderRadius: '8px',
                                border:
                                  '2px solid ' +
                                  (control.ok ? '#a7f3d0' : '#fecaca'),
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
                                'span',
                                {
                                  style: {
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                  },
                                },
                                etiquetas[nombre] || nombre
                              ),
                              React.createElement(
                                'div',
                                { style: { display: 'flex', gap: '4px' } },
                                React.createElement(
                                  'button',
                                  {
                                    style: {
                                      padding: '4px 8px',
                                      background: control.ok
                                        ? '#059669'
                                        : '#10b981',
                                      color: 'white',
                                      border: control.ok
                                        ? '2px solid #065f46'
                                        : 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var co = Object.assign({}, v.controles);
                                      co[nombre] = Object.assign(
                                        {},
                                        co[nombre],
                                        { ok: true }
                                      );
                                      props.onActualizar(v.id, {
                                        controles: co,
                                      });
                                    },
                                  },
                                  '✓ OK'
                                ),
                                React.createElement(
                                  'button',
                                  {
                                    style: {
                                      padding: '4px 8px',
                                      background: !control.ok
                                        ? '#b91c1c'
                                        : '#ef4444',
                                      color: 'white',
                                      border: !control.ok
                                        ? '2px solid #991b1b'
                                        : 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var co = Object.assign({}, v.controles);
                                      co[nombre] = Object.assign(
                                        {},
                                        co[nombre],
                                        { ok: false }
                                      );
                                      props.onActualizar(v.id, {
                                        controles: co,
                                      });
                                    },
                                  },
                                  '✗ NO'
                                )
                              )
                            ),
                            React.createElement('input', {
                              type: 'text',
                              placeholder: 'Observaciones',
                              value: control.observaciones || '',
                              onChange: function (e) {
                                var co = Object.assign({}, v.controles);
                                co[nombre] = Object.assign({}, co[nombre], {
                                  observaciones: e.target.value,
                                });
                                props.onActualizar(v.id, { controles: co });
                              },
                              style: {
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                boxSizing: 'border-box',
                              },
                            })
                          );
                        })
                      )
                    ),

                  // TAB COMPARTIMIENTOS
                  tabActual === 'compartimientos' &&
                    React.createElement(
                      'div',
                      null,
                      // Agregar compartimiento
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#fffbeb',
                            padding: '16px',
                            borderRadius: '10px',
                            border: '2px solid #fde68a',
                            marginBottom: '20px',
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
                          '➕ Nuevo Compartimiento'
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '10px' } },
                          React.createElement('input', {
                            type: 'text',
                            placeholder:
                              'Nombre del compartimiento (Ej: Lateral Derecho)',
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
                                background: '#f59e0b',
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
                                  alert('Ingresa un nombre');
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
                            'div',
                            {
                              style: {
                                textAlign: 'center',
                                padding: '40px',
                                color: '#6b7280',
                              },
                            },
                            React.createElement(
                              'div',
                              {
                                style: {
                                  fontSize: '48px',
                                  marginBottom: '12px',
                                },
                              },
                              '🗄️'
                            ),
                            React.createElement(
                              'p',
                              null,
                              'No hay compartimientos. Agrega uno arriba.'
                            )
                          )
                        : React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                              },
                            },
                            compartimientos.map(function (comp) {
                              var compKey = v.id + '_' + comp.id;
                              var compExp = expandComp[compKey];
                              var totalItemsComp = (
                                comp.subcompartimientos || []
                              ).reduce(function (acc, s) {
                                return acc + (s.items || []).length;
                              }, 0);

                              return React.createElement(
                                'div',
                                {
                                  key: comp.id,
                                  style: {
                                    border: '2px solid #fde68a',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                  },
                                },
                                // Header compartimiento
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      background: '#fffbeb',
                                      padding: '14px 16px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                    },
                                    onClick: function (e) {
                                      e.stopPropagation();
                                      var ec = Object.assign({}, expandComp);
                                      ec[compKey] = !ec[compKey];
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
                                        'h4',
                                        {
                                          style: {
                                            fontWeight: 'bold',
                                            fontSize: '15px',
                                            color: '#92400e',
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
                                          totalItemsComp +
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
                                      { style: { color: '#6b7280' } },
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
                                    // Agregar subcompartimiento
                                    React.createElement(
                                      'div',
                                      {
                                        style: {
                                          background: '#f0fdf4',
                                          padding: '12px',
                                          borderRadius: '8px',
                                          border: '1px solid #bbf7d0',
                                          marginBottom: '14px',
                                        },
                                      },
                                      React.createElement(
                                        'p',
                                        {
                                          style: {
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: '#15803d',
                                            marginBottom: '8px',
                                          },
                                        },
                                        '➕ Nuevo Subcompartimiento'
                                      ),
                                      React.createElement(
                                        'div',
                                        {
                                          style: {
                                            display: 'flex',
                                            gap: '8px',
                                          },
                                        },
                                        React.createElement('input', {
                                          type: 'text',
                                          placeholder:
                                            'Nombre (Ej: Estante Superior)',
                                          value: nuevoSubNombres[comp.id] || '',
                                          onChange: function (e) {
                                            var u = Object.assign(
                                              {},
                                              nuevoSubNombres
                                            );
                                            u[comp.id] = e.target.value;
                                            setNuevoSubNombres(u);
                                          },
                                          style: Object.assign(
                                            {},
                                            styles.input,
                                            { flex: 1, fontSize: '13px' }
                                          ),
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
                                                alert('Ingresa un nombre');
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
                                          '➕ Agregar'
                                        )
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
                                              padding: '16px',
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
                                              gap: '12px',
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
                                                // Header subcompartimiento
                                                React.createElement(
                                                  'div',
                                                  {
                                                    style: {
                                                      background: '#f9fafb',
                                                      padding: '12px 14px',
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      alignItems: 'center',
                                                    },
                                                  },
                                                  React.createElement(
                                                    'div',
                                                    {
                                                      style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                      },
                                                    },
                                                    React.createElement(
                                                      'span',
                                                      {
                                                        style: {
                                                          fontSize: '16px',
                                                        },
                                                      },
                                                      '📂'
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
                                                            color: '#374151',
                                                          },
                                                        },
                                                        sub.nombre
                                                      ),
                                                      React.createElement(
                                                        'p',
                                                        {
                                                          style: {
                                                            fontSize: '11px',
                                                            color: '#6b7280',
                                                          },
                                                        },
                                                        (sub.items || [])
                                                          .length + ' items'
                                                      )
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
                                                        borderRadius: '5px',
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

                                                // Agregar item al subcompartimiento
                                                React.createElement(
                                                  'div',
                                                  {
                                                    style: {
                                                      padding: '12px',
                                                      background: '#fafafa',
                                                      borderTop:
                                                        '1px solid #e5e7eb',
                                                    },
                                                  },
                                                  React.createElement(
                                                    'div',
                                                    {
                                                      style: {
                                                        display: 'grid',
                                                        gridTemplateColumns:
                                                          '2fr 1fr auto',
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
                                                        style: {
                                                          padding: '7px',
                                                          border:
                                                            '1px solid #d1d5db',
                                                          borderRadius: '6px',
                                                          fontSize: '12px',
                                                        },
                                                      },
                                                      React.createElement(
                                                        'option',
                                                        { value: '' },
                                                        'Seleccionar item del inventario...'
                                                      ),
                                                      props.inventario
                                                        .filter(function (i) {
                                                          return (
                                                            i.estado !== 'baja'
                                                          );
                                                        })
                                                        .map(function (item) {
                                                          return React.createElement(
                                                            'option',
                                                            {
                                                              key: item.id,
                                                              value: item.id,
                                                            },
                                                            item.nombre +
                                                              ' [' +
                                                              item.categoria +
                                                              '] - Stock: ' +
                                                              (item.stock || 0)
                                                          );
                                                        })
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
                                                          padding: '7px',
                                                          border:
                                                            '1px solid #d1d5db',
                                                          borderRadius: '6px',
                                                          fontSize: '12px',
                                                        },
                                                        min: '1',
                                                        placeholder: 'Cant.',
                                                      }
                                                    ),
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
                                                              'Selecciona un item'
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
                                                          var u2 =
                                                            Object.assign(
                                                              {},
                                                              cantSelSubcomp
                                                            );
                                                          u2[cantSelKey] = 1;
                                                          setCantSelSubcomp(u2);
                                                        },
                                                      },
                                                      '➕ Agregar'
                                                    )
                                                  ),

                                                  // Lista de items del subcompartimiento
                                                  (sub.items || []).length === 0
                                                    ? React.createElement(
                                                        'p',
                                                        {
                                                          style: {
                                                            color: '#9ca3af',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            padding: '8px',
                                                          },
                                                        },
                                                        'Sin items asignados'
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
                                                            var catColores = {
                                                              herramienta:
                                                                '#3b82f6',
                                                              equipo: '#8b5cf6',
                                                              material:
                                                                '#10b981',
                                                              repuesto:
                                                                '#f59e0b',
                                                              EPP: '#ef4444',
                                                            };
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
                                                                {
                                                                  style: {
                                                                    display:
                                                                      'flex',
                                                                    alignItems:
                                                                      'center',
                                                                    gap: '8px',
                                                                    flex: 1,
                                                                  },
                                                                },
                                                                React.createElement(
                                                                  'span',
                                                                  {
                                                                    style: {
                                                                      background:
                                                                        catColores[
                                                                          item
                                                                            .categoria
                                                                        ] ||
                                                                        '#6b7280',
                                                                      color:
                                                                        'white',
                                                                      padding:
                                                                        '2px 6px',
                                                                      borderRadius:
                                                                        '4px',
                                                                      fontSize:
                                                                        '10px',
                                                                      fontWeight:
                                                                        '600',
                                                                    },
                                                                  },
                                                                  item.categoria ||
                                                                    '-'
                                                                ),
                                                                React.createElement(
                                                                  'span',
                                                                  {
                                                                    style: {
                                                                      fontSize:
                                                                        '13px',
                                                                      fontWeight:
                                                                        '500',
                                                                    },
                                                                  },
                                                                  item.nombre
                                                                )
                                                              ),
                                                              React.createElement(
                                                                'div',
                                                                {
                                                                  style: {
                                                                    display:
                                                                      'flex',
                                                                    alignItems:
                                                                      'center',
                                                                    gap: '6px',
                                                                  },
                                                                },
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '2px 7px',
                                                                      background:
                                                                        '#e5e7eb',
                                                                      border:
                                                                        'none',
                                                                      borderRadius:
                                                                        '4px',
                                                                      cursor:
                                                                        'pointer',
                                                                      fontWeight:
                                                                        'bold',
                                                                      fontSize:
                                                                        '13px',
                                                                    },
                                                                    onClick:
                                                                      function (
                                                                        e
                                                                      ) {
                                                                        e.stopPropagation();
                                                                        if (
                                                                          (item.cantidadEsperada ||
                                                                            0) >
                                                                          1
                                                                        ) {
                                                                          props.onActualizarCantidadItemSubcomp(
                                                                            v.id,
                                                                            comp.id,
                                                                            sub.id,
                                                                            item.itemId,
                                                                            (item.cantidadEsperada ||
                                                                              0) -
                                                                              1
                                                                          );
                                                                        }
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
                                                                        '2px 10px',
                                                                      borderRadius:
                                                                        '6px',
                                                                      fontWeight:
                                                                        '700',
                                                                      fontSize:
                                                                        '13px',
                                                                      minWidth:
                                                                        '32px',
                                                                      textAlign:
                                                                        'center',
                                                                    },
                                                                  },
                                                                  item.cantidadEsperada ||
                                                                    0
                                                                ),
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '2px 7px',
                                                                      background:
                                                                        '#e5e7eb',
                                                                      border:
                                                                        'none',
                                                                      borderRadius:
                                                                        '4px',
                                                                      cursor:
                                                                        'pointer',
                                                                      fontWeight:
                                                                        'bold',
                                                                      fontSize:
                                                                        '13px',
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
                                                                            0) +
                                                                            1
                                                                        );
                                                                      },
                                                                  },
                                                                  '+'
                                                                ),
                                                                React.createElement(
                                                                  'span',
                                                                  {
                                                                    style: {
                                                                      fontSize:
                                                                        '11px',
                                                                      color:
                                                                        '#6b7280',
                                                                    },
                                                                  },
                                                                  item.unidad ||
                                                                    'u'
                                                                ),
                                                                React.createElement(
                                                                  'button',
                                                                  {
                                                                    style: {
                                                                      padding:
                                                                        '4px 8px',
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
                                                                  '🗑️'
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

                  // TAB ITEMS GENERALES
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
                              gridTemplateColumns: '2fr 1fr auto',
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
                              'Item'
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
                                'Seleccionar...'
                              ),
                              props.inventario
                                .filter(function (i) {
                                  return (
                                    i.estado !== 'baja' && (i.stock || 0) > 0
                                  );
                                })
                                .map(function (item) {
                                  return React.createElement(
                                    'option',
                                    { key: item.id, value: item.id },
                                    item.nombre +
                                      ' [' +
                                      item.categoria +
                                      '] - Stock: ' +
                                      (item.stock || 0)
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
                              style: styles.input,
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
                                  alert('Selecciona un item');
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
                            'No hay items generales asignados'
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
                              var itemInv = props.inventario.find(function (i) {
                                return i.id === item.itemId;
                              });
                              var catColores = {
                                herramienta: '#3b82f6',
                                equipo: '#8b5cf6',
                                material: '#10b981',
                                repuesto: '#f59e0b',
                                EPP: '#ef4444',
                              };
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
                                  {
                                    style: {
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      flex: 1,
                                    },
                                  },
                                  React.createElement(
                                    'span',
                                    {
                                      style: {
                                        background:
                                          catColores[item.categoria] ||
                                          '#6b7280',
                                        color: 'white',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                      },
                                    },
                                    item.categoria || '-'
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
                                      item.nombre
                                    ),
                                    itemInv &&
                                      React.createElement(
                                        'p',
                                        {
                                          style: {
                                            fontSize: '11px',
                                            color: '#6b7280',
                                          },
                                        },
                                        'Stock inventario: ' +
                                          (itemInv.stock || 0) +
                                          ' ' +
                                          (itemInv.unidad || 'u')
                                      )
                                  )
                                ),
                                React.createElement(
                                  'div',
                                  {
                                    style: {
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    },
                                  },
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '4px 8px',
                                        background: '#e5e7eb',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                      },
                                      onClick: function (e) {
                                        e.stopPropagation();
                                        if ((item.cantidad || 0) > 1) {
                                          props.onActualizarCantidadItem(
                                            v.id,
                                            item.itemId,
                                            (item.cantidad || 0) - 1
                                          );
                                        }
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
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        textAlign: 'center',
                                      },
                                    },
                                    item.cantidad || 0
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      style: {
                                        padding: '4px 8px',
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
                                          (item.cantidad || 0) + 1
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

                  // TAB ERAs
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
                              display: 'grid',
                              gridTemplateColumns: '1fr auto',
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
                              'ERA Disponible'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: eraAsignar,
                                onChange: function (e) {
                                  setEraAsignar(e.target.value);
                                },
                                style: styles.input,
                              },
                              React.createElement(
                                'option',
                                { value: '' },
                                'Seleccionar ERA...'
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
                                    ' bar'
                                );
                              })
                            )
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
                                  alert('Selecciona una ERA');
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
                                    padding: '14px',
                                    background: tieneAlerta
                                      ? '#fef2f2'
                                      : '#f5f3ff',
                                    borderRadius: '10px',
                                    border:
                                      '2px solid ' +
                                      (tieneAlerta ? '#ef4444' : '#ddd6fe'),
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
                                    'div',
                                    null,
                                    React.createElement(
                                      'h4',
                                      {
                                        style: {
                                          fontWeight: 'bold',
                                          fontSize: '15px',
                                          color: '#7c3aed',
                                        },
                                      },
                                      '🎽 ' + era.marca + ' ' + era.modelo
                                    ),
                                    React.createElement(
                                      'p',
                                      {
                                        style: {
                                          fontSize: '12px',
                                          color: '#6b7280',
                                        },
                                      },
                                      '🔖 ' + era.serial
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
                                            (era.presion || 0) >= 280
                                              ? '#d1fae5'
                                              : '#fee2e2',
                                          color:
                                            (era.presion || 0) >= 280
                                              ? '#065f46'
                                              : '#dc2626',
                                          padding: '4px 10px',
                                          borderRadius: '8px',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                        },
                                      },
                                      era.presion + ' bar'
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
                                            window.confirm('¿Desasignar ERA?')
                                          ) {
                                            props.onDesasignarERA(v.id, era.id);
                                          }
                                        },
                                      },
                                      '↩️ Quitar'
                                    )
                                  )
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
                                  era.pruebaHidraulica &&
                                    React.createElement(
                                      'span',
                                      {
                                        style: {
                                          fontSize: '11px',
                                          background:
                                            vencPH === 'vencido'
                                              ? '#fee2e2'
                                              : '#f3f4f6',
                                          color:
                                            vencPH === 'vencido'
                                              ? '#dc2626'
                                              : '#374151',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                        },
                                      },
                                      '🔧 PH: ' + era.pruebaHidraulica
                                    ),
                                  era.vencimientoTubo &&
                                    React.createElement(
                                      'span',
                                      {
                                        style: {
                                          fontSize: '11px',
                                          background:
                                            vencTubo === 'vencido'
                                              ? '#fee2e2'
                                              : '#f3f4f6',
                                          color:
                                            vencTubo === 'vencido'
                                              ? '#dc2626'
                                              : '#374151',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                        },
                                      },
                                      '🧪 Tubo: ' + era.vencimientoTubo
                                    )
                                )
                              );
                            })
                          )
                    ),

                  // TAB VTV
                  tabActual === 'vtv' &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            background: '#f0f9ff',
                            padding: '20px',
                            borderRadius: '12px',
                            border: '2px solid #bae6fd',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              color: '#0891b2',
                              marginBottom: '16px',
                            },
                          },
                          '🚗 Verificación Técnica Vehicular'
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                              marginBottom: '16px',
                            },
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement(
                              'label',
                              { style: styles.label },
                              'Estado VTV'
                            ),
                            React.createElement(
                              'select',
                              {
                                value: v.vtv && v.vtv.apta ? 'apta' : 'no-apta',
                                onChange: function (e) {
                                  props.onActualizar(v.id, {
                                    vtv: Object.assign({}, v.vtv || {}, {
                                      apta: e.target.value === 'apta',
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
                                    v.vtv && v.vtv.apta ? '#ecfdf5' : '#fee2e2',
                                },
                              },
                              React.createElement(
                                'option',
                                { value: 'apta' },
                                '✅ APTA'
                              ),
                              React.createElement(
                                'option',
                                { value: 'no-apta' },
                                '❌ NO APTA'
                              )
                            )
                          ),
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
                              value: (v.vtv && v.vtv.vencimiento) || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    vencimiento: e.target.value,
                                  }),
                                });
                              },
                              style: {
                                width: '100%',
                                padding: '10px',
                                border:
                                  '1px solid ' +
                                  getBorderColor(
                                    verificarVencimiento(
                                      v.vtv && v.vtv.vencimiento
                                    )
                                  ),
                                borderRadius: '8px',
                                fontSize: '14px',
                                background: getBgColor(
                                  verificarVencimiento(
                                    v.vtv && v.vtv.vencimiento
                                  )
                                ),
                              },
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
                              value: (v.vtv && v.vtv.observaciones) || '',
                              onChange: function (e) {
                                props.onActualizar(v.id, {
                                  vtv: Object.assign({}, v.vtv || {}, {
                                    observaciones: e.target.value,
                                  }),
                                });
                              },
                              style: {
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                              },
                              placeholder: 'Observaciones VTV...',
                            })
                          )
                        ),
                        diasVtv !== null &&
                          React.createElement(
                            'div',
                            {
                              style: {
                                padding: '12px 16px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontWeight: '700',
                                fontSize: '14px',
                                color: vtvColor,
                              },
                            },
                            vtvEstado === 'apta'
                              ? '✅ VTV vigente - ' +
                                  diasVtv +
                                  ' días restantes'
                              : vtvEstado === 'proxima'
                              ? '⚠️ VTV próxima a vencer - ' + diasVtv + ' días'
                              : vtvEstado === 'vencida'
                              ? '❌ VTV vencida hace ' +
                                Math.abs(diasVtv) +
                                ' días'
                              : ''
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
// CHECKLISTS CON COMPARTIMIENTOS
// ============================================
function Checklists(props) {
  var vehSelState = useState(null);
  var vehiculoSel = vehSelState[0];
  var setVehiculoSel = vehSelState[1];
  var tipoState = useState(null);
  var tipo = tipoState[0];
  var setTipo = tipoState[1];
  var compSelState = useState(null);
  var compSel = compSelState[0];
  var setCompSel = compSelState[1];
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
  var estadoCompsState = useState({});
  var estadoComps = estadoCompsState[0];
  var setEstadoComps = estadoCompsState[1];
  var itemsInventarioState = useState([]);
  var itemsInventario = itemsInventarioState[0];
  var setItemsInventario = itemsInventarioState[1];
  var obsState = useState('');
  var obs = obsState[0];
  var setObs = obsState[1];
  var vistaHistState = useState(false);
  var vistaHist = vistaHistState[0];
  var setVistaHist = vistaHistState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];

  var nombresAmigablesFluidos = {
    aceite: '🛢️ Aceite de Motor',
    refrigerante: '🌡️ Refrigerante',
    combustible: '⛽ Combustible',
    liquidoFrenos: '🔴 Líquido de Frenos',
  };
  var nombresAmigablesLuces = {
    luces: '💡 Luces',
    lucesEmergencia: '🚨 Luces de Emergencia',
    sirena: '📢 Sirena',
    bocina: '📯 Bocina',
  };

  var iniciarChecklist = function (vehiculo, tipoCheck, comp) {
    setVehiculoSel(vehiculo);
    setTipo(tipoCheck);
    setCompSel(comp || null);
    setObs('');
    setItemsInventario([]);

    if (tipoCheck === 'fluidos') {
      var ef = {};
      Object.keys(vehiculo.fluidos || {}).forEach(function (n) {
        ef[n] = { ok: null, observaciones: '' };
      });
      setEstadoFluidos(ef);
      var el = {};
      Object.keys(
        vehiculo.controles || {
          luces: true,
          lucesEmergencia: true,
          sirena: true,
          bocina: true,
        }
      ).forEach(function (n) {
        el[n] = { ok: null, observaciones: '' };
      });
      setEstadoLuces(el);
    }

    if (tipoCheck === 'items') {
      var ei = {};
      (vehiculo.itemsAsignados || []).forEach(function (item) {
        ei[item.itemId] = {
          ok: null,
          observaciones: '',
          nombre: item.nombre,
          cantidadEsperada: item.cantidad,
          cantidadReal: item.cantidad,
          categoria: item.categoria,
        };
      });
      setEstadoItems(ei);
    }

    if (tipoCheck === 'eras') {
      var ee = {};
      var erasAsignadas = (vehiculo.erasAsignadas || [])
        .map(function (eraId) {
          return props.eras.find(function (e) {
            return e.id === eraId;
          });
        })
        .filter(Boolean);
      erasAsignadas.forEach(function (era) {
        ee[era.id] = {
          ok: null,
          observaciones: '',
          presionReal: era.presion || 0,
          nombre: era.marca + ' ' + era.modelo,
          serial: era.serial,
        };
      });
      setEstadoERAs(ee);
    }

    if (tipoCheck === 'compartimiento' && comp) {
      var ec = {};
      (comp.subcompartimientos || []).forEach(function (sub) {
        ec[sub.id] = { nombre: sub.nombre, items: {} };
        (sub.items || []).forEach(function (item) {
          ec[sub.id].items[item.itemId] = {
            ok: null,
            observaciones: '',
            nombre: item.nombre,
            cantidadEsperada: item.cantidadEsperada,
            cantidadReal: item.cantidadEsperada,
            categoria: item.categoria,
          };
        });
      });
      setEstadoComps(ec);
    }
  };

  var cancelar = function () {
    setVehiculoSel(null);
    setTipo(null);
    setCompSel(null);
    setEstadoFluidos({});
    setEstadoLuces({});
    setEstadoItems({});
    setEstadoERAs({});
    setEstadoComps({});
    setItemsInventario([]);
    setObs('');
  };

  var guardar = async function () {
    var todosItems = [];
    var sinResponder = 0;

    if (tipo === 'fluidos') {
      var itemsFluidos = Object.entries(estadoFluidos).map(function (e) {
        return {
          nombre: e[0],
          nombreAmigable: nombresAmigablesFluidos[e[0]] || e[0],
          ok: e[1].ok,
          observaciones: e[1].observaciones,
        };
      });
      var itemsLuces = Object.entries(estadoLuces).map(function (e) {
        return {
          nombre: e[0],
          nombreAmigable: nombresAmigablesLuces[e[0]] || e[0],
          ok: e[1].ok,
          observaciones: e[1].observaciones,
        };
      });
      sinResponder =
        itemsFluidos.filter(function (i) {
          return i.ok === null;
        }).length +
        itemsLuces.filter(function (i) {
          return i.ok === null;
        }).length;
      todosItems = itemsFluidos.concat(itemsLuces);
    }

    if (tipo === 'items') {
      var itemsCheck = Object.entries(estadoItems).map(function (e) {
        return {
          itemId: e[0],
          nombre: e[1].nombre,
          categoria: e[1].categoria,
          cantidadEsperada: e[1].cantidadEsperada,
          cantidadReal: e[1].cantidadReal,
          ok: e[1].ok,
          observaciones: e[1].observaciones,
        };
      });
      sinResponder = itemsCheck.filter(function (i) {
        return i.ok === null;
      }).length;
      todosItems = itemsCheck;
    }

    if (tipo === 'eras') {
      var erasCheck = Object.entries(estadoERAs).map(function (e) {
        return {
          eraId: e[0],
          nombre: e[1].nombre,
          serial: e[1].serial,
          presionReal: e[1].presionReal,
          ok: e[1].ok,
          observaciones: e[1].observaciones,
        };
      });
      sinResponder = erasCheck.filter(function (i) {
        return i.ok === null;
      }).length;
      todosItems = erasCheck;
    }

    if (tipo === 'compartimiento') {
      Object.entries(estadoComps).forEach(function (subEntry) {
        var subId = subEntry[0];
        var subData = subEntry[1];
        Object.entries(subData.items || {}).forEach(function (itemEntry) {
          var itemId = itemEntry[0];
          var itemData = itemEntry[1];
          todosItems.push({
            subId: subId,
            subNombre: subData.nombre,
            itemId: itemId,
            nombre: itemData.nombre,
            categoria: itemData.categoria,
            cantidadEsperada: itemData.cantidadEsperada,
            cantidadReal: itemData.cantidadReal,
            ok: itemData.ok,
            observaciones: itemData.observaciones,
          });
          if (itemData.ok === null) sinResponder++;
        });
      });
    }

    if (sinResponder > 0) {
      alert('Faltan ' + sinResponder + ' items por responder');
      return;
    }

    setGuardando(true);
    try {
      var itemsInvUsados = itemsInventario.filter(function (i) {
        return i.itemId && i.usado && i.cantidad > 0;
      });
      for (var i = 0; i < itemsInvUsados.length; i++) {
        await props.onDescontarStock(
          itemsInvUsados[i].itemId,
          itemsInvUsados[i].cantidad,
          props.usuario ? props.usuario.nombre : 'Checklist',
          'Usado en checklist - ' + (vehiculoSel ? vehiculoSel.nombre : '')
        );
      }
      var registro = {
        vehiculoId: vehiculoSel.id,
        vehiculoNombre: vehiculoSel.nombre,
        tipo: tipo,
        compartimientoNombre: compSel ? compSel.nombre : '',
        items: todosItems,
        itemsInventarioUsados: itemsInventario,
        observacionGeneral: obs,
        usuario: props.usuario ? props.usuario.nombre : '-',
        fecha: new Date().toLocaleString(),
        resultado: todosItems.every(function (i) {
          return i.ok;
        })
          ? 'ok'
          : 'con_observaciones',
      };
      var id = await props.onGuardar(registro);
      if (id) {
        alert('✅ Checklist guardado correctamente');
        cancelar();
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  var agregarItemInventario = function () {
    setItemsInventario(
      itemsInventario.concat([
        { itemId: '', cantidad: 1, usado: false, observaciones: '' },
      ])
    );
  };
  var actualizarItemInventario = function (idx, campo, valor) {
    setItemsInventario(
      itemsInventario.map(function (item, i) {
        return i === idx ? Object.assign({}, item, { [campo]: valor }) : item;
      })
    );
  };
  var eliminarItemInventario = function (idx) {
    setItemsInventario(
      itemsInventario.filter(function (_, i) {
        return i !== idx;
      })
    );
  };

  // VISTA FORMULARIO CHECKLIST
  if (vehiculoSel && tipo) {
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
            marginBottom: '20px',
          },
        },
        React.createElement(
          'h2',
          { style: styles.pageTitle },
          tipo === 'fluidos'
            ? '🛢️ Control Fluidos y Señales'
            : tipo === 'items'
            ? '📦 Control Items Generales'
            : tipo === 'eras'
            ? '🎽 Control ERAs'
            : '🗄️ Control Compartimiento: ' + (compSel ? compSel.nombre : '')
        ),
        React.createElement(
          'button',
          {
            style: Object.assign({}, styles.btnPrimary, {
              background: '#6b7280',
            }),
            onClick: cancelar,
          },
          '✖ Cancelar'
        )
      ),

      // Info vehículo
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0f9ff',
            border: '2px solid #0ea5e9',
            marginBottom: '20px',
          }),
        },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
          React.createElement('div', { style: { fontSize: '40px' } }, '🚛'),
          React.createElement(
            'div',
            null,
            React.createElement(
              'h3',
              {
                style: {
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#0369a1',
                },
              },
              vehiculoSel.nombre
            ),
            React.createElement(
              'p',
              { style: { color: '#6b7280', fontSize: '13px' } },
              vehiculoSel.tipo +
                (vehiculoSel.patente ? ' · ' + vehiculoSel.patente : '')
            ),
            React.createElement(
              'p',
              { style: { color: '#6b7280', fontSize: '12px' } },
              '👤 ' +
                (props.usuario ? props.usuario.nombre : '-') +
                ' | 📅 ' +
                new Date().toLocaleString()
            )
          )
        )
      ),

      // CHECKLIST FLUIDOS
      tipo === 'fluidos' &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: Object.assign({}, styles.card, {
                border: '2px solid #fde68a',
                background: '#fffbeb',
                marginBottom: '16px',
              }),
            },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '16px',
                },
              },
              '🛢️ Control de Fluidos'
            ),
            Object.keys(estadoFluidos).length === 0
              ? React.createElement(
                  'p',
                  { style: { color: '#6b7280' } },
                  'No hay fluidos registrados'
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
                  Object.entries(estadoFluidos).map(function (entry) {
                    var nombre = entry[0];
                    var fluido = entry[1];
                    return React.createElement(
                      'div',
                      {
                        key: nombre,
                        style: {
                          background:
                            fluido.ok === null
                              ? 'white'
                              : fluido.ok
                              ? '#ecfdf5'
                              : '#fee2e2',
                          padding: '16px',
                          borderRadius: '10px',
                          border:
                            '2px solid ' +
                            (fluido.ok === null
                              ? '#d1d5db'
                              : fluido.ok
                              ? '#10b981'
                              : '#ef4444'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          },
                        },
                        React.createElement(
                          'h4',
                          { style: { fontWeight: 'bold', fontSize: '15px' } },
                          nombresAmigablesFluidos[nombre] || nombre
                        ),
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '8px' } },
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 18px',
                                background:
                                  fluido.ok === true ? '#059669' : '#10b981',
                                color: 'white',
                                border:
                                  fluido.ok === true
                                    ? '3px solid #065f46'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoFluidos);
                                u[nombre] = Object.assign({}, fluido, {
                                  ok: true,
                                });
                                setEstadoFluidos(u);
                              },
                            },
                            '✓ OK'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 18px',
                                background:
                                  fluido.ok === false ? '#b91c1c' : '#ef4444',
                                color: 'white',
                                border:
                                  fluido.ok === false
                                    ? '3px solid #991b1b'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoFluidos);
                                u[nombre] = Object.assign({}, fluido, {
                                  ok: false,
                                });
                                setEstadoFluidos(u);
                              },
                            },
                            '✗ NO OK'
                          )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: fluido.observaciones,
                        onChange: function (e) {
                          var u = Object.assign({}, estadoFluidos);
                          u[nombre] = Object.assign({}, fluido, {
                            observaciones: e.target.value,
                          });
                          setEstadoFluidos(u);
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
          React.createElement(
            'div',
            {
              style: Object.assign({}, styles.card, {
                border: '2px solid #bae6fd',
                background: '#f0f9ff',
                marginBottom: '16px',
              }),
            },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#0369a1',
                  marginBottom: '16px',
                },
              },
              '💡 Control de Luces y Señales'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                },
              },
              Object.entries(estadoLuces).map(function (entry) {
                var nombre = entry[0];
                var control = entry[1];
                return React.createElement(
                  'div',
                  {
                    key: nombre,
                    style: {
                      background:
                        control.ok === null
                          ? 'white'
                          : control.ok
                          ? '#ecfdf5'
                          : '#fee2e2',
                      padding: '16px',
                      borderRadius: '10px',
                      border:
                        '2px solid ' +
                        (control.ok === null
                          ? '#d1d5db'
                          : control.ok
                          ? '#10b981'
                          : '#ef4444'),
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      },
                    },
                    React.createElement(
                      'h4',
                      { style: { fontWeight: 'bold', fontSize: '15px' } },
                      nombresAmigablesLuces[nombre] || nombre
                    ),
                    React.createElement(
                      'div',
                      { style: { display: 'flex', gap: '8px' } },
                      React.createElement(
                        'button',
                        {
                          style: {
                            padding: '8px 18px',
                            background:
                              control.ok === true ? '#059669' : '#10b981',
                            color: 'white',
                            border:
                              control.ok === true
                                ? '3px solid #065f46'
                                : 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          },
                          onClick: function () {
                            var u = Object.assign({}, estadoLuces);
                            u[nombre] = Object.assign({}, control, {
                              ok: true,
                            });
                            setEstadoLuces(u);
                          },
                        },
                        '✓ OK'
                      ),
                      React.createElement(
                        'button',
                        {
                          style: {
                            padding: '8px 18px',
                            background:
                              control.ok === false ? '#b91c1c' : '#ef4444',
                            color: 'white',
                            border:
                              control.ok === false
                                ? '3px solid #991b1b'
                                : 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          },
                          onClick: function () {
                            var u = Object.assign({}, estadoLuces);
                            u[nombre] = Object.assign({}, control, {
                              ok: false,
                            });
                            setEstadoLuces(u);
                          },
                        },
                        '✗ NO OK'
                      )
                    )
                  ),
                  React.createElement('input', {
                    type: 'text',
                    placeholder: 'Observaciones...',
                    value: control.observaciones,
                    onChange: function (e) {
                      var u = Object.assign({}, estadoLuces);
                      u[nombre] = Object.assign({}, control, {
                        observaciones: e.target.value,
                      });
                      setEstadoLuces(u);
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
          )
        ),

      // CHECKLIST COMPARTIMIENTO
      tipo === 'compartimiento' &&
        compSel &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: Object.assign({}, styles.card, {
                border: '2px solid #fde68a',
                background: '#fffbeb',
                marginBottom: '16px',
              }),
            },
            React.createElement(
              'h3',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '16px',
                },
              },
              '🗄️ ' + compSel.nombre
            ),
            (compSel.subcompartimientos || []).length === 0
              ? React.createElement(
                  'p',
                  {
                    style: {
                      color: '#6b7280',
                      textAlign: 'center',
                      padding: '24px',
                    },
                  },
                  'No hay subcompartimientos en este compartimiento'
                )
              : React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    },
                  },
                  (compSel.subcompartimientos || []).map(function (sub) {
                    var subEstado = estadoComps[sub.id] || {
                      nombre: sub.nombre,
                      items: {},
                    };
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
                            padding: '12px 16px',
                            borderBottom: '1px solid #e5e7eb',
                          },
                        },
                        React.createElement(
                          'h4',
                          {
                            style: {
                              fontWeight: 'bold',
                              fontSize: '15px',
                              color: '#374151',
                            },
                          },
                          '📂 ' + sub.nombre
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          (sub.items || []).length + ' items a verificar'
                        )
                      ),
                      React.createElement(
                        'div',
                        { style: { padding: '14px' } },
                        (sub.items || []).length === 0
                          ? React.createElement(
                              'p',
                              {
                                style: {
                                  color: '#9ca3af',
                                  fontSize: '13px',
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
                                  flexDirection: 'column',
                                  gap: '10px',
                                },
                              },
                              (sub.items || []).map(function (item) {
                                var itemEstado = subEstado.items[
                                  item.itemId
                                ] || {
                                  ok: null,
                                  observaciones: '',
                                  cantidadEsperada: item.cantidadEsperada,
                                  cantidadReal: item.cantidadEsperada,
                                };
                                return React.createElement(
                                  'div',
                                  {
                                    key: item.itemId,
                                    style: {
                                      background:
                                        itemEstado.ok === null
                                          ? 'white'
                                          : itemEstado.ok
                                          ? '#ecfdf5'
                                          : '#fee2e2',
                                      padding: '14px',
                                      borderRadius: '8px',
                                      border:
                                        '2px solid ' +
                                        (itemEstado.ok === null
                                          ? '#d1d5db'
                                          : itemEstado.ok
                                          ? '#10b981'
                                          : '#ef4444'),
                                    },
                                  },
                                  React.createElement(
                                    'div',
                                    {
                                      style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '10px',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                      },
                                    },
                                    React.createElement(
                                      'div',
                                      null,
                                      React.createElement(
                                        'h4',
                                        {
                                          style: {
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            marginBottom: '6px',
                                          },
                                        },
                                        item.nombre
                                      ),
                                      React.createElement(
                                        'div',
                                        {
                                          style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
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
                                              borderRadius: '6px',
                                              fontWeight: '600',
                                            },
                                          },
                                          'Esperado: ' +
                                            item.cantidadEsperada +
                                            ' ' +
                                            (item.unidad || 'u')
                                        ),
                                        React.createElement(
                                          'div',
                                          {
                                            style: {
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            },
                                          },
                                          React.createElement(
                                            'span',
                                            {
                                              style: {
                                                fontSize: '12px',
                                                color: '#374151',
                                                fontWeight: '600',
                                              },
                                            },
                                            'Real:'
                                          ),
                                          React.createElement(
                                            'button',
                                            {
                                              style: {
                                                padding: '2px 8px',
                                                background: '#e5e7eb',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                              },
                                              onClick: function () {
                                                var u = Object.assign(
                                                  {},
                                                  estadoComps
                                                );
                                                if (!u[sub.id])
                                                  u[sub.id] = {
                                                    nombre: sub.nombre,
                                                    items: {},
                                                  };
                                                u[sub.id].items[item.itemId] =
                                                  Object.assign(
                                                    {},
                                                    itemEstado,
                                                    {
                                                      cantidadReal: Math.max(
                                                        0,
                                                        (itemEstado.cantidadReal ||
                                                          0) - 1
                                                      ),
                                                    }
                                                  );
                                                setEstadoComps(u);
                                              },
                                            },
                                            '-'
                                          ),
                                          React.createElement(
                                            'span',
                                            {
                                              style: {
                                                background:
                                                  (itemEstado.cantidadReal ||
                                                    0) < item.cantidadEsperada
                                                    ? '#fee2e2'
                                                    : '#d1fae5',
                                                color:
                                                  (itemEstado.cantidadReal ||
                                                    0) < item.cantidadEsperada
                                                    ? '#dc2626'
                                                    : '#059669',
                                                padding: '2px 10px',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: '14px',
                                                minWidth: '36px',
                                                textAlign: 'center',
                                              },
                                            },
                                            itemEstado.cantidadReal || 0
                                          ),
                                          React.createElement(
                                            'button',
                                            {
                                              style: {
                                                padding: '2px 8px',
                                                background: '#e5e7eb',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                              },
                                              onClick: function () {
                                                var u = Object.assign(
                                                  {},
                                                  estadoComps
                                                );
                                                if (!u[sub.id])
                                                  u[sub.id] = {
                                                    nombre: sub.nombre,
                                                    items: {},
                                                  };
                                                u[sub.id].items[item.itemId] =
                                                  Object.assign(
                                                    {},
                                                    itemEstado,
                                                    {
                                                      cantidadReal:
                                                        (itemEstado.cantidadReal ||
                                                          0) + 1,
                                                    }
                                                  );
                                                setEstadoComps(u);
                                              },
                                            },
                                            '+'
                                          ),
                                          React.createElement(
                                            'span',
                                            {
                                              style: {
                                                fontSize: '11px',
                                                color: '#6b7280',
                                              },
                                            },
                                            item.unidad || 'u'
                                          )
                                        )
                                      )
                                    ),
                                    React.createElement(
                                      'div',
                                      {
                                        style: { display: 'flex', gap: '8px' },
                                      },
                                      React.createElement(
                                        'button',
                                        {
                                          style: {
                                            padding: '8px 16px',
                                            background:
                                              itemEstado.ok === true
                                                ? '#059669'
                                                : '#10b981',
                                            color: 'white',
                                            border:
                                              itemEstado.ok === true
                                                ? '3px solid #065f46'
                                                : 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                          },
                                          onClick: function () {
                                            var u = Object.assign(
                                              {},
                                              estadoComps
                                            );
                                            if (!u[sub.id])
                                              u[sub.id] = {
                                                nombre: sub.nombre,
                                                items: {},
                                              };
                                            u[sub.id].items[item.itemId] =
                                              Object.assign({}, itemEstado, {
                                                ok: true,
                                                nombre: item.nombre,
                                                categoria: item.categoria,
                                                cantidadEsperada:
                                                  item.cantidadEsperada,
                                              });
                                            setEstadoComps(u);
                                          },
                                        },
                                        '✓ OK'
                                      ),
                                      React.createElement(
                                        'button',
                                        {
                                          style: {
                                            padding: '8px 16px',
                                            background:
                                              itemEstado.ok === false
                                                ? '#b91c1c'
                                                : '#ef4444',
                                            color: 'white',
                                            border:
                                              itemEstado.ok === false
                                                ? '3px solid #991b1b'
                                                : 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                          },
                                          onClick: function () {
                                            var u = Object.assign(
                                              {},
                                              estadoComps
                                            );
                                            if (!u[sub.id])
                                              u[sub.id] = {
                                                nombre: sub.nombre,
                                                items: {},
                                              };
                                            u[sub.id].items[item.itemId] =
                                              Object.assign({}, itemEstado, {
                                                ok: false,
                                                nombre: item.nombre,
                                                categoria: item.categoria,
                                                cantidadEsperada:
                                                  item.cantidadEsperada,
                                              });
                                            setEstadoComps(u);
                                          },
                                        },
                                        '✗ FALTA'
                                      )
                                    )
                                  ),
                                  React.createElement('input', {
                                    type: 'text',
                                    placeholder: 'Observaciones...',
                                    value: itemEstado.observaciones || '',
                                    onChange: function (e) {
                                      var u = Object.assign({}, estadoComps);
                                      if (!u[sub.id])
                                        u[sub.id] = {
                                          nombre: sub.nombre,
                                          items: {},
                                        };
                                      u[sub.id].items[item.itemId] =
                                        Object.assign({}, itemEstado, {
                                          observaciones: e.target.value,
                                        });
                                      setEstadoComps(u);
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
                      )
                    );
                  })
                )
          )
        ),

      // CHECKLIST ITEMS GENERALES
      tipo === 'items' &&
        React.createElement(
          'div',
          null,
          Object.keys(estadoItems).length === 0
            ? React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    textAlign: 'center',
                    padding: '40px',
                  }),
                },
                React.createElement(
                  'div',
                  { style: { fontSize: '48px', marginBottom: '12px' } },
                  '📦'
                ),
                React.createElement(
                  'p',
                  { style: { color: '#6b7280' } },
                  'No hay items generales asignados'
                )
              )
            : React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    border: '2px solid #bbf7d0',
                    background: '#f0fdf4',
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      color: '#15803d',
                      marginBottom: '16px',
                    },
                  },
                  '📦 Items Generales (' + Object.keys(estadoItems).length + ')'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
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
                          background:
                            item.ok === null
                              ? 'white'
                              : item.ok
                              ? '#ecfdf5'
                              : '#fee2e2',
                          padding: '16px',
                          borderRadius: '10px',
                          border:
                            '2px solid ' +
                            (item.ok === null
                              ? '#d1d5db'
                              : item.ok
                              ? '#10b981'
                              : '#ef4444'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '10px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'h4',
                            {
                              style: {
                                fontWeight: 'bold',
                                fontSize: '15px',
                                marginBottom: '4px',
                              },
                            },
                            item.nombre
                          ),
                          React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
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
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                },
                              },
                              'Esperado: ' + item.cantidadEsperada
                            ),
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                },
                              },
                              React.createElement(
                                'span',
                                {
                                  style: {
                                    fontSize: '12px',
                                    color: '#374151',
                                    fontWeight: '600',
                                  },
                                },
                                'Real:'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '2px 8px',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                  },
                                  onClick: function () {
                                    var u = Object.assign({}, estadoItems);
                                    u[itemId] = Object.assign({}, item, {
                                      cantidadReal: Math.max(
                                        0,
                                        (item.cantidadReal || 0) - 1
                                      ),
                                    });
                                    setEstadoItems(u);
                                  },
                                },
                                '-'
                              ),
                              React.createElement(
                                'span',
                                {
                                  style: {
                                    background:
                                      item.cantidadReal < item.cantidadEsperada
                                        ? '#fee2e2'
                                        : '#d1fae5',
                                    color:
                                      item.cantidadReal < item.cantidadEsperada
                                        ? '#dc2626'
                                        : '#059669',
                                    padding: '2px 10px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    minWidth: '36px',
                                    textAlign: 'center',
                                  },
                                },
                                item.cantidadReal || 0
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '2px 8px',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                  },
                                  onClick: function () {
                                    var u = Object.assign({}, estadoItems);
                                    u[itemId] = Object.assign({}, item, {
                                      cantidadReal:
                                        (item.cantidadReal || 0) + 1,
                                    });
                                    setEstadoItems(u);
                                  },
                                },
                                '+'
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
                                padding: '8px 18px',
                                background:
                                  item.ok === true ? '#059669' : '#10b981',
                                color: 'white',
                                border:
                                  item.ok === true
                                    ? '3px solid #065f46'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoItems);
                                u[itemId] = Object.assign({}, item, {
                                  ok: true,
                                });
                                setEstadoItems(u);
                              },
                            },
                            '✓ OK'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 18px',
                                background:
                                  item.ok === false ? '#b91c1c' : '#ef4444',
                                color: 'white',
                                border:
                                  item.ok === false
                                    ? '3px solid #991b1b'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoItems);
                                u[itemId] = Object.assign({}, item, {
                                  ok: false,
                                });
                                setEstadoItems(u);
                              },
                            },
                            '✗ FALTA'
                          )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: item.observaciones,
                        onChange: function (e) {
                          var u = Object.assign({}, estadoItems);
                          u[itemId] = Object.assign({}, item, {
                            observaciones: e.target.value,
                          });
                          setEstadoItems(u);
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
              )
        ),

      // CHECKLIST ERAs
      tipo === 'eras' &&
        React.createElement(
          'div',
          null,
          Object.keys(estadoERAs).length === 0
            ? React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    textAlign: 'center',
                    padding: '40px',
                  }),
                },
                React.createElement(
                  'div',
                  { style: { fontSize: '48px', marginBottom: '12px' } },
                  '🎽'
                ),
                React.createElement(
                  'p',
                  { style: { color: '#6b7280' } },
                  'No hay ERAs asignadas'
                )
              )
            : React.createElement(
                'div',
                {
                  style: Object.assign({}, styles.card, {
                    border: '2px solid #ddd6fe',
                    background: '#f5f3ff',
                    marginBottom: '16px',
                  }),
                },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      color: '#7c3aed',
                      marginBottom: '16px',
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
                      gap: '12px',
                    },
                  },
                  Object.entries(estadoERAs).map(function (entry) {
                    var eraId = entry[0];
                    var estado = entry[1];
                    return React.createElement(
                      'div',
                      {
                        key: eraId,
                        style: {
                          background:
                            estado.ok === null
                              ? 'white'
                              : estado.ok
                              ? '#ecfdf5'
                              : '#fee2e2',
                          padding: '16px',
                          borderRadius: '10px',
                          border:
                            '2px solid ' +
                            (estado.ok === null
                              ? '#d1d5db'
                              : estado.ok
                              ? '#10b981'
                              : '#ef4444'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '10px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          },
                        },
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'h4',
                            {
                              style: {
                                fontWeight: 'bold',
                                fontSize: '15px',
                                color: '#7c3aed',
                                marginBottom: '4px',
                              },
                            },
                            '🎽 ' + estado.nombre
                          ),
                          React.createElement(
                            'p',
                            {
                              style: {
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '8px',
                              },
                            },
                            '🔖 ' + estado.serial
                          ),
                          React.createElement(
                            'div',
                            {
                              style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              },
                            },
                            React.createElement(
                              'span',
                              {
                                style: {
                                  fontSize: '12px',
                                  background: '#ede9fe',
                                  color: '#7c3aed',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                },
                              },
                              'Presión reg.: ' +
                                (props.eras.find(function (e) {
                                  return e.id === eraId;
                                })
                                  ? props.eras.find(function (e) {
                                      return e.id === eraId;
                                    }).presion
                                  : 0) +
                                ' bar'
                            ),
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                },
                              },
                              React.createElement(
                                'span',
                                {
                                  style: {
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  },
                                },
                                'Real:'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '2px 8px',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                  },
                                  onClick: function () {
                                    var u = Object.assign({}, estadoERAs);
                                    u[eraId] = Object.assign({}, estado, {
                                      presionReal: Math.max(
                                        0,
                                        (estado.presionReal || 0) - 10
                                      ),
                                    });
                                    setEstadoERAs(u);
                                  },
                                },
                                '-'
                              ),
                              React.createElement(
                                'span',
                                {
                                  style: {
                                    background:
                                      (estado.presionReal || 0) >= 280
                                        ? '#d1fae5'
                                        : '#fee2e2',
                                    color:
                                      (estado.presionReal || 0) >= 280
                                        ? '#059669'
                                        : '#dc2626',
                                    padding: '2px 10px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    minWidth: '60px',
                                    textAlign: 'center',
                                  },
                                },
                                (estado.presionReal || 0) + ' bar'
                              ),
                              React.createElement(
                                'button',
                                {
                                  style: {
                                    padding: '2px 8px',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                  },
                                  onClick: function () {
                                    var u = Object.assign({}, estadoERAs);
                                    u[eraId] = Object.assign({}, estado, {
                                      presionReal:
                                        (estado.presionReal || 0) + 10,
                                    });
                                    setEstadoERAs(u);
                                  },
                                },
                                '+'
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
                                padding: '8px 18px',
                                background:
                                  estado.ok === true ? '#059669' : '#10b981',
                                color: 'white',
                                border:
                                  estado.ok === true
                                    ? '3px solid #065f46'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoERAs);
                                u[eraId] = Object.assign({}, estado, {
                                  ok: true,
                                });
                                setEstadoERAs(u);
                              },
                            },
                            '✓ OK'
                          ),
                          React.createElement(
                            'button',
                            {
                              style: {
                                padding: '8px 18px',
                                background:
                                  estado.ok === false ? '#b91c1c' : '#ef4444',
                                color: 'white',
                                border:
                                  estado.ok === false
                                    ? '3px solid #991b1b'
                                    : 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              },
                              onClick: function () {
                                var u = Object.assign({}, estadoERAs);
                                u[eraId] = Object.assign({}, estado, {
                                  ok: false,
                                });
                                setEstadoERAs(u);
                              },
                            },
                            '✗ NO OK'
                          )
                        )
                      ),
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'Observaciones...',
                        value: estado.observaciones,
                        onChange: function (e) {
                          var u = Object.assign({}, estadoERAs);
                          u[eraId] = Object.assign({}, estado, {
                            observaciones: e.target.value,
                          });
                          setEstadoERAs(u);
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
              )
        ),

      // ITEMS INVENTARIO USADOS
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            border: '2px solid #a855f7',
            background: '#fdf4ff',
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
              marginBottom: '14px',
            },
          },
          React.createElement(
            'h3',
            {
              style: { fontWeight: 'bold', color: '#7e22ce', fontSize: '16px' },
            },
            '📦 Items de Inventario Utilizados'
          ),
          React.createElement(
            'button',
            {
              style: {
                padding: '8px 14px',
                background: '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
              },
              onClick: agregarItemInventario,
            },
            '➕ Agregar'
          )
        ),
        itemsInventario.length === 0
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
              'No se han registrado items utilizados'
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
              itemsInventario.map(function (item, idx) {
                var itemDatos = props.inventario.find(function (i) {
                  return i.id === item.itemId;
                });
                return React.createElement(
                  'div',
                  {
                    key: idx,
                    style: {
                      background: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e9d5ff',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '10px',
                        alignItems: 'end',
                      },
                    },
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'label',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '3px',
                          },
                        },
                        'Item'
                      ),
                      React.createElement(
                        'select',
                        {
                          value: item.itemId,
                          onChange: function (e) {
                            actualizarItemInventario(
                              idx,
                              'itemId',
                              e.target.value
                            );
                          },
                          style: {
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '12px',
                          },
                        },
                        React.createElement(
                          'option',
                          { value: '' },
                          'Seleccionar...'
                        ),
                        props.inventario
                          .filter(function (i) {
                            return i.estado !== 'baja';
                          })
                          .map(function (i) {
                            return React.createElement(
                              'option',
                              { key: i.id, value: i.id },
                              i.nombre + ' [Stock: ' + (i.stock || 0) + ']'
                            );
                          })
                      )
                    ),
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'label',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '3px',
                          },
                        },
                        'Cantidad'
                      ),
                      React.createElement('input', {
                        type: 'number',
                        value: item.cantidad,
                        onChange: function (e) {
                          actualizarItemInventario(
                            idx,
                            'cantidad',
                            parseInt(e.target.value) || 1
                          );
                        },
                        style: {
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '12px',
                        },
                        min: '1',
                        max: itemDatos ? itemDatos.stock : 9999,
                      })
                    ),
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'label',
                        {
                          style: {
                            fontSize: '11px',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '3px',
                          },
                        },
                        'Descontar'
                      ),
                      React.createElement(
                        'button',
                        {
                          style: {
                            width: '100%',
                            padding: '8px',
                            background: item.usado ? '#059669' : '#e5e7eb',
                            color: item.usado ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          },
                          onClick: function () {
                            actualizarItemInventario(idx, 'usado', !item.usado);
                          },
                        },
                        item.usado ? '✅ Sí' : '⬜ No'
                      )
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '8px 10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          alignSelf: 'flex-end',
                        },
                        onClick: function () {
                          eliminarItemInventario(idx);
                        },
                      },
                      '🗑️'
                    )
                  ),
                  item.itemId &&
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'Observaciones del uso...',
                      value: item.observaciones,
                      onChange: function (e) {
                        actualizarItemInventario(
                          idx,
                          'observaciones',
                          e.target.value
                        );
                      },
                      style: {
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #e9d5ff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        marginTop: '8px',
                      },
                    })
                );
              })
            )
      ),

      // OBSERVACION GENERAL Y GUARDAR
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#fffbeb',
            border: '1px solid #fde68a',
            marginBottom: '16px',
          }),
        },
        React.createElement(
          'label',
          {
            style: {
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#92400e',
            },
          },
          '📝 Observación General'
        ),
        React.createElement('textarea', {
          value: obs,
          onChange: function (e) {
            setObs(e.target.value);
          },
          placeholder: 'Observaciones generales...',
          style: {
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical',
            boxSizing: 'border-box',
          },
        })
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '12px' } },
        React.createElement(
          'button',
          {
            style: {
              flex: 1,
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
          guardando ? '⏳ Guardando...' : '💾 Guardar Checklist'
        ),
        React.createElement(
          'button',
          {
            style: {
              flex: 1,
              padding: '16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
            },
            onClick: cancelar,
          },
          '✖ Cancelar'
        )
      )
    );
  }

  // VISTA PRINCIPAL CHECKLISTS
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
          style: Object.assign({}, styles.btnPrimary, {
            background: vistaHist ? '#2563eb' : '#6b7280',
          }),
          onClick: function () {
            setVistaHist(!vistaHist);
          },
        },
        vistaHist ? '🚛 Ver Móviles' : '📜 Ver Historial'
      )
    ),

    !vistaHist &&
      React.createElement(
        'div',
        null,
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
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                },
              },
              props.vehiculos.map(function (v) {
                var itemsAsignados = v.itemsAsignados || [];
                var erasAsignadas = (v.erasAsignadas || [])
                  .map(function (eraId) {
                    return props.eras.find(function (e) {
                      return e.id === eraId;
                    });
                  })
                  .filter(Boolean);
                var compartimientos = v.compartimientos || [];
                var ultimosChecks = props.checklists.filter(function (c) {
                  return c.vehiculoId === v.id;
                });
                var ultimoCheck =
                  ultimosChecks.length > 0 ? ultimosChecks[0] : null;

                return React.createElement(
                  'div',
                  {
                    key: v.id,
                    style: Object.assign({}, styles.card, {
                      border:
                        '2px solid ' +
                        (v.estado === 'operativo' ? '#10b981' : '#f59e0b'),
                    }),
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px',
                      },
                    },
                    React.createElement(
                      'div',
                      {
                        style: {
                          width: '56px',
                          height: '56px',
                          background:
                            v.estado === 'operativo'
                              ? 'linear-gradient(135deg, #10b981, #059669)'
                              : 'linear-gradient(135deg, #f59e0b, #d97706)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          flexShrink: 0,
                        },
                      },
                      '🚛'
                    ),
                    React.createElement(
                      'div',
                      { style: { flex: 1 } },
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
                        'p',
                        {
                          style: {
                            color: '#6b7280',
                            fontSize: '13px',
                            marginBottom: '4px',
                          },
                        },
                        v.tipo + (v.patente ? ' · ' + v.patente : '')
                      ),
                      ultimoCheck &&
                        React.createElement(
                          'p',
                          { style: { fontSize: '11px', color: '#9ca3af' } },
                          '📅 Último: ' +
                            ultimoCheck.fecha +
                            ' (' +
                            (ultimoCheck.tipo === 'compartimiento'
                              ? 'Comp: ' + ultimoCheck.compartimientoNombre
                              : ultimoCheck.tipo) +
                            ')'
                        )
                    )
                  ),

                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '8px',
                        marginBottom: compartimientos.length > 0 ? '12px' : '0',
                      },
                    },
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '12px',
                          background: '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '13px',
                        },
                        onClick: function () {
                          iniciarChecklist(v, 'fluidos');
                        },
                      },
                      '🛢️ Fluidos y Señales'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '12px',
                          background:
                            itemsAsignados.length === 0 ? '#d1d5db' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor:
                            itemsAsignados.length === 0
                              ? 'not-allowed'
                              : 'pointer',
                          fontSize: '13px',
                        },
                        onClick: function () {
                          if (itemsAsignados.length > 0) {
                            iniciarChecklist(v, 'items');
                          } else {
                            alert('No hay items generales asignados');
                          }
                        },
                      },
                      '📦 Items (' + itemsAsignados.length + ')'
                    ),
                    React.createElement(
                      'button',
                      {
                        style: {
                          padding: '12px',
                          background:
                            erasAsignadas.length === 0 ? '#d1d5db' : '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor:
                            erasAsignadas.length === 0
                              ? 'not-allowed'
                              : 'pointer',
                          fontSize: '13px',
                        },
                        onClick: function () {
                          if (erasAsignadas.length > 0) {
                            iniciarChecklist(v, 'eras');
                          } else {
                            alert('No hay ERAs asignadas');
                          }
                        },
                      },
                      '🎽 ERAs (' + erasAsignadas.length + ')'
                    )
                  ),

                  compartimientos.length > 0 &&
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#92400e',
                            marginBottom: '8px',
                          },
                        },
                        '🗄️ Checklist por Compartimiento:'
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '8px',
                          },
                        },
                        compartimientos.map(function (comp) {
                          var totalItems = (
                            comp.subcompartimientos || []
                          ).reduce(function (acc, s) {
                            return acc + (s.items || []).length;
                          }, 0);
                          return React.createElement(
                            'button',
                            {
                              key: comp.id,
                              style: {
                                padding: '10px 14px',
                                background:
                                  totalItems === 0 ? '#f3f4f6' : '#fffbeb',
                                color: totalItems === 0 ? '#9ca3af' : '#92400e',
                                border:
                                  '2px solid ' +
                                  (totalItems === 0 ? '#e5e7eb' : '#fde68a'),
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor:
                                  totalItems === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                textAlign: 'left',
                              },
                              onClick: function () {
                                if (totalItems === 0) {
                                  alert('Este compartimiento no tiene items');
                                  return;
                                }
                                iniciarChecklist(v, 'compartimiento', comp);
                              },
                            },
                            React.createElement(
                              'div',
                              {
                                style: {
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                },
                              },
                              React.createElement('span', null, '🗄️'),
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      margin: 0,
                                      fontSize: '12px',
                                      fontWeight: '700',
                                    },
                                  },
                                  comp.nombre
                                ),
                                React.createElement(
                                  'p',
                                  {
                                    style: {
                                      margin: 0,
                                      fontSize: '11px',
                                      opacity: 0.8,
                                    },
                                  },
                                  (comp.subcompartimientos || []).length +
                                    ' sub · ' +
                                    totalItems +
                                    ' items'
                                )
                              )
                            )
                          );
                        })
                      )
                    )
                );
              })
            )
      ),

    vistaHist &&
      React.createElement(
        'div',
        null,
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
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                },
              },
              props.checklists.map(function (c) {
                var todosOk =
                  (c.items || []).length > 0 &&
                  (c.items || []).every(function (i) {
                    return i.ok;
                  });
                var itemsNok = (c.items || []).filter(function (i) {
                  return !i.ok;
                });
                var invUsados = (c.itemsInventarioUsados || []).filter(
                  function (i) {
                    return i.usado;
                  }
                );
                var tipoIcono =
                  c.tipo === 'fluidos'
                    ? '🛢️'
                    : c.tipo === 'items'
                    ? '📦'
                    : c.tipo === 'eras'
                    ? '🎽'
                    : '🗄️';
                var tipoLabel =
                  c.tipo === 'fluidos'
                    ? 'Fluidos y Señales'
                    : c.tipo === 'items'
                    ? 'Items Generales'
                    : c.tipo === 'eras'
                    ? 'ERAs'
                    : 'Compartimiento: ' + (c.compartimientoNombre || '');
                var tipoColor =
                  c.tipo === 'fluidos'
                    ? '#0ea5e9'
                    : c.tipo === 'items'
                    ? '#10b981'
                    : c.tipo === 'eras'
                    ? '#8b5cf6'
                    : '#f59e0b';

                return React.createElement(
                  'div',
                  {
                    key: c.id,
                    style: Object.assign({}, styles.card, {
                      border: '2px solid ' + (todosOk ? '#10b981' : '#f59e0b'),
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
                        gap: '12px',
                        marginBottom: '12px',
                      },
                    },
                    React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '6px',
                          },
                        },
                        React.createElement(
                          'span',
                          { style: { fontSize: '22px' } },
                          tipoIcono
                        ),
                        React.createElement(
                          'h3',
                          { style: { fontSize: '17px', fontWeight: 'bold' } },
                          c.vehiculoNombre
                        ),
                        React.createElement(
                          'span',
                          {
                            style: {
                              background: tipoColor,
                              color: 'white',
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '600',
                            },
                          },
                          tipoLabel
                        )
                      ),
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap',
                          },
                        },
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          '👤 ' + c.usuario
                        ),
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          '📅 ' + c.fecha
                        ),
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          '📊 ' + (c.items || []).length + ' items'
                        ),
                        invUsados.length > 0 &&
                          React.createElement(
                            'span',
                            {
                              style: {
                                fontSize: '12px',
                                background: '#ede9fe',
                                color: '#7c3aed',
                                padding: '2px 8px',
                                borderRadius: '6px',
                              },
                            },
                            '📦 ' + invUsados.length + ' usados'
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
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          style: {
                            background: todosOk ? '#d1fae5' : '#fef3c7',
                            color: todosOk ? '#065f46' : '#92400e',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '700',
                          },
                        },
                        todosOk ? '✅ TODO OK' : '⚠️ CON OBSERVACIONES'
                      ),
                      React.createElement(
                        'button',
                        {
                          style: {
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          },
                          onClick: function () {
                            if (window.confirm('¿Eliminar este registro?')) {
                              props.onEliminar(c.id);
                            }
                          },
                        },
                        '🗑️'
                      )
                    )
                  ),

                  itemsNok.length > 0 &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#fef3c7',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                        },
                      },
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontWeight: '600',
                            color: '#92400e',
                            marginBottom: '6px',
                            fontSize: '13px',
                          },
                        },
                        '⚠️ Items con problemas:'
                      ),
                      itemsNok.slice(0, 5).map(function (item, i) {
                        return React.createElement(
                          'p',
                          {
                            key: i,
                            style: {
                              fontSize: '12px',
                              color: '#78350f',
                              paddingLeft: '12px',
                            },
                          },
                          '• ' +
                            (item.nombreAmigable ||
                              item.nombre ||
                              item.serial ||
                              '-') +
                            (item.subNombre
                              ? ' [' + item.subNombre + ']'
                              : '') +
                            (item.cantidadReal !== undefined
                              ? ' (Real: ' +
                                item.cantidadReal +
                                ' / Esp: ' +
                                item.cantidadEsperada +
                                ')'
                              : '') +
                            (item.presionReal !== undefined
                              ? ' (Presión: ' + item.presionReal + ' bar)'
                              : '') +
                            (item.observaciones
                              ? ': ' + item.observaciones
                              : '')
                        );
                      }),
                      itemsNok.length > 5 &&
                        React.createElement(
                          'p',
                          {
                            style: {
                              fontSize: '12px',
                              color: '#78350f',
                              paddingLeft: '12px',
                            },
                          },
                          '... y ' + (itemsNok.length - 5) + ' más'
                        )
                    ),

                  invUsados.length > 0 &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f5f3ff',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                        },
                      },
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontWeight: '600',
                            color: '#7e22ce',
                            marginBottom: '6px',
                            fontSize: '13px',
                          },
                        },
                        '📦 Items utilizados:'
                      ),
                      invUsados.map(function (item, i) {
                        var itemDatos = props.inventario
                          ? props.inventario.find(function (inv) {
                              return inv.id === item.itemId;
                            })
                          : null;
                        return React.createElement(
                          'p',
                          {
                            key: i,
                            style: {
                              fontSize: '12px',
                              color: '#6b21a8',
                              paddingLeft: '12px',
                            },
                          },
                          '• ' +
                            (itemDatos ? itemDatos.nombre : item.itemId) +
                            ' x' +
                            item.cantidad +
                            (item.observaciones
                              ? ' - ' + item.observaciones
                              : '')
                        );
                      })
                    ),

                  c.observacionGeneral &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          background: '#f9fafb',
                          padding: '10px 14px',
                          borderRadius: '8px',
                        },
                      },
                      React.createElement(
                        'p',
                        { style: { fontSize: '13px', color: '#374151' } },
                        '📝 ' + c.observacionGeneral
                      )
                    )
                );
              })
            )
      )
  );
}

// ============================================
// PANEL
// ============================================
function Panel(props) {
  var operativos = props.vehiculos.filter(function (v) {
    return v.estado === 'operativo';
  }).length;
  var activos = props.eras.filter(function (e) {
    return e.estado === 'activo';
  }).length;
  var vtvAptas = props.vehiculos.filter(function (v) {
    return (
      v.vtv &&
      v.vtv.apta &&
      v.vtv.vencimiento &&
      new Date(v.vtv.vencimiento) >= new Date()
    );
  }).length;
  var equiposVencidos = props.equipos.filter(function (eq) {
    return (
      eq.proximoMantenimiento && new Date(eq.proximoMantenimiento) < new Date()
    );
  }).length;
  var totalCompartimientos = props.vehiculos.reduce(function (acc, v) {
    return acc + (v.compartimientos || []).length;
  }, 0);

  var alertas = [];
  props.itemsBajoStock.forEach(function (item) {
    alertas.push({
      texto:
        '📦 ' +
        item.nombre +
        ' - Stock bajo (' +
        (item.stock || 0) +
        ' ' +
        (item.unidad || 'u') +
        ')',
      tipo: 'stock',
    });
  });
  props.equipos.forEach(function (eq) {
    if (
      eq.proximoMantenimiento &&
      new Date(eq.proximoMantenimiento) < new Date()
    ) {
      alertas.push({
        texto: '🧯 ' + eq.nombre + ' - Mantenimiento vencido',
        tipo: 'equipo',
      });
    }
  });
  props.vehiculos.forEach(function (v) {
    if (v.vtv && v.vtv.vencimiento) {
      var dias = Math.ceil(
        (new Date(v.vtv.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          texto: '🚛 ' + v.nombre + ' - VTV VENCIDA',
          tipo: 'vtv',
        });
      else if (dias <= 30)
        alertas.push({
          texto: '🚛 ' + v.nombre + ' - VTV vence en ' + dias + ' días',
          tipo: 'vtv',
        });
    }
    if (v.pruebaHidraulica) {
      var diasPH = Math.ceil(
        (new Date(v.pruebaHidraulica) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (diasPH < 0)
        alertas.push({
          texto: '🚛 ' + v.nombre + ' - Prueba Hidráulica VENCIDA',
          tipo: 'hidraulica',
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
          texto: '🎽 ' + era.marca + ' ' + era.modelo + ' - Tubo VENCIDO',
          tipo: 'era',
        });
      else if (dias <= 30)
        alertas.push({
          texto:
            '🎽 ' +
            era.marca +
            ' ' +
            era.modelo +
            ' - Tubo vence en ' +
            dias +
            ' días',
          tipo: 'era',
        });
    }
  });
  props.personal.forEach(function (p) {
    if (p.licencia) {
      var dias = Math.ceil(
        (new Date(p.licencia) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0)
        alertas.push({
          texto: '👤 ' + p.nombre + ' ' + p.apellido + ' - Licencia VENCIDA',
          tipo: 'personal',
        });
      else if (dias <= 30)
        alertas.push({
          texto:
            '👤 ' +
            p.nombre +
            ' ' +
            p.apellido +
            ' - Licencia vence en ' +
            dias +
            ' días',
          tipo: 'personal',
        });
    }
  });

  var kpis = [
    {
      icon: '🚛',
      valor: props.vehiculos.length,
      label: 'Móviles (' + operativos + ' operativos)',
      bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      vista: 'vehiculos',
    },
    {
      icon: '🗄️',
      valor: totalCompartimientos,
      label: 'Compartimientos',
      bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      vista: 'vehiculos',
    },
    {
      icon: '🎽',
      valor: activos,
      label: 'ERAs Activas',
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      vista: 'eras',
    },
    {
      icon: '🚗',
      valor: vtvAptas,
      label: 'VTV Aptas',
      bg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      vista: 'vehiculos',
    },
    {
      icon: '📦',
      valor: props.inventario.length,
      label: 'Items Inventario',
      bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      vista: 'inventario',
    },
    {
      icon: '⚠️',
      valor: alertas.length,
      label: 'Alertas Activas',
      bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      vista: null,
    },
  ];

  return React.createElement(
    'div',
    null,
    React.createElement(
      'h2',
      { style: styles.pageTitle },
      '📊 Panel de Control'
    ),
    React.createElement(
      'div',
      { style: styles.grid },
      kpis.map(function (k, i) {
        return React.createElement(
          'div',
          {
            key: i,
            style: Object.assign({}, styles.kpi, {
              background: k.bg,
              cursor: k.vista ? 'pointer' : 'default',
            }),
            onClick: function () {
              if (k.vista) props.setVista(k.vista);
            },
          },
          React.createElement(
            'div',
            { style: { fontSize: '32px', marginBottom: '8px' } },
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
            { style: { fontSize: '12px', opacity: 0.9 } },
            k.label
          )
        );
      })
    ),

    alertas.length > 0 &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            border: '2px solid #ef4444',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#dc2626' }) },
          '🚨 Alertas del Sistema (' + alertas.length + ')'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          alertas.map(function (a, i) {
            return React.createElement(
              'div',
              {
                key: i,
                style: {
                  background: '#fef2f2',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #ef4444',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#991b1b',
                },
              },
              a.texto
            );
          })
        )
      ),

    props.itemsBajoStock.length > 0 &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            border: '2px solid #f59e0b',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#d97706' }) },
          '📦 Items con Bajo Stock'
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            },
          },
          props.itemsBajoStock.map(function (item) {
            return React.createElement(
              'div',
              {
                key: item.id,
                style: {
                  background: '#fffbeb',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                },
              },
              React.createElement(
                'p',
                {
                  style: {
                    fontWeight: '600',
                    fontSize: '14px',
                    marginBottom: '4px',
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
                    marginBottom: '8px',
                  },
                },
                item.categoria
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between' } },
                React.createElement(
                  'span',
                  {
                    style: {
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                    },
                  },
                  'Stock: ' + (item.stock || 0) + ' ' + (item.unidad || 'u')
                ),
                React.createElement(
                  'span',
                  { style: { fontSize: '11px', color: '#9ca3af' } },
                  'Mín: ' + (item.stockMinimo || 5)
                )
              )
            );
          })
        )
      ),

    props.vehiculos.length > 0 &&
      React.createElement(
        'div',
        { style: Object.assign({}, styles.card, { marginBottom: '24px' }) },
        React.createElement(
          'h3',
          { style: styles.cardTitle },
          '🚛 Estado de Móviles'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          props.vehiculos.map(function (v) {
            var compartimientos = v.compartimientos || [];
            var totalItems = compartimientos.reduce(function (acc, c) {
              return (
                acc +
                (c.subcompartimientos || []).reduce(function (acc2, s) {
                  return acc2 + (s.items || []).length;
                }, 0)
              );
            }, 0);
            var vtvEstado = 'sin-datos';
            if (v.vtv && v.vtv.vencimiento) {
              var dias = Math.ceil(
                (new Date(v.vtv.vencimiento) - new Date()) /
                  (1000 * 60 * 60 * 24)
              );
              if (!v.vtv.apta || dias < 0) vtvEstado = 'vencida';
              else if (dias <= 30) vtvEstado = 'proxima';
              else vtvEstado = 'apta';
            }
            return React.createElement(
              'div',
              {
                key: v.id,
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  flexWrap: 'wrap',
                  gap: '8px',
                },
              },
              React.createElement(
                'div',
                {
                  style: { display: 'flex', alignItems: 'center', gap: '12px' },
                },
                React.createElement(
                  'span',
                  { style: { fontSize: '24px' } },
                  '🚛'
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
                        marginBottom: '2px',
                      },
                    },
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
                'div',
                {
                  style: {
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  },
                },
                compartimientos.length > 0 &&
                  React.createElement(
                    'span',
                    {
                      style: {
                        fontSize: '12px',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                      },
                    },
                    '🗄️ ' +
                      compartimientos.length +
                      ' comp · ' +
                      totalItems +
                      ' items'
                  ),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: '12px',
                      background: '#ede9fe',
                      color: '#7c3aed',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: '600',
                    },
                  },
                  '🎽 ' + (v.erasAsignadas || []).length + ' ERAs'
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      background:
                        vtvEstado === 'apta'
                          ? '#d1fae5'
                          : vtvEstado === 'proxima'
                          ? '#fef3c7'
                          : vtvEstado === 'vencida'
                          ? '#fee2e2'
                          : '#f3f4f6',
                      color:
                        vtvEstado === 'apta'
                          ? '#065f46'
                          : vtvEstado === 'proxima'
                          ? '#92400e'
                          : vtvEstado === 'vencida'
                          ? '#dc2626'
                          : '#6b7280',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                    },
                  },
                  vtvEstado === 'apta'
                    ? '🚗 VTV OK'
                    : vtvEstado === 'proxima'
                    ? '🚗 VTV PRÓXIMA'
                    : vtvEstado === 'vencida'
                    ? '🚗 VTV VENCIDA'
                    : '🚗 VTV S/D'
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      background:
                        v.estado === 'operativo' ? '#d1fae5' : '#fef3c7',
                      color: v.estado === 'operativo' ? '#065f46' : '#92400e',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                    },
                  },
                  v.estado === 'operativo' ? '✅ Operativo' : '🔧 Mantenimiento'
                )
              )
            );
          })
        )
      ),

    props.checklists &&
      props.checklists.length > 0 &&
      React.createElement(
        'div',
        { style: styles.card },
        React.createElement(
          'h3',
          { style: styles.cardTitle },
          '📋 Últimos Checklists'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          props.checklists.slice(0, 5).map(function (c) {
            var todosOk = (c.items || []).every(function (i) {
              return i.ok;
            });
            var tipoIcono =
              c.tipo === 'fluidos'
                ? '🛢️'
                : c.tipo === 'items'
                ? '📦'
                : c.tipo === 'eras'
                ? '🎽'
                : '🗄️';
            var tipoLabel =
              c.tipo === 'fluidos'
                ? 'Fluidos'
                : c.tipo === 'items'
                ? 'Items'
                : c.tipo === 'eras'
                ? 'ERAs'
                : 'Comp: ' + (c.compartimientoNombre || '');
            return React.createElement(
              'div',
              {
                key: c.id,
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: todosOk ? '#ecfdf5' : '#fef3c7',
                  borderRadius: '8px',
                  border: '1px solid ' + (todosOk ? '#a7f3d0' : '#fde68a'),
                  flexWrap: 'wrap',
                  gap: '8px',
                },
              },
              React.createElement(
                'div',
                {
                  style: { display: 'flex', alignItems: 'center', gap: '10px' },
                },
                React.createElement(
                  'span',
                  { style: { fontSize: '18px' } },
                  tipoIcono
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
                        marginBottom: '2px',
                      },
                    },
                    c.vehiculoNombre + ' - ' + tipoLabel
                  ),
                  React.createElement(
                    'p',
                    { style: { fontSize: '11px', color: '#6b7280' } },
                    '👤 ' + c.usuario + ' | 📅 ' + c.fecha
                  )
                )
              ),
              React.createElement(
                'span',
                {
                  style: {
                    background: todosOk ? '#d1fae5' : '#fef3c7',
                    color: todosOk ? '#065f46' : '#92400e',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                  },
                },
                todosOk ? '✅ OK' : '⚠️ Obs.'
              )
            );
          })
        )
      )
  );
}
// ============================================
// LOGIN
// ============================================
function Login(props) {
  var emailState = useState('');
  var email = emailState[0];
  var setEmail = emailState[1];
  var passwordState = useState('');
  var password = passwordState[0];
  var setPassword = passwordState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  var handleSubmit = function (e) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Ingresa tu email');
      return;
    }
    if (!password.trim()) {
      setError('Ingresa tu contraseña');
      return;
    }
    if (password.length < 4) {
      setError('Contraseña muy corta');
      return;
    }
    setError('');
    props.onLogin(email, password);
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
          padding: '48px 40px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        },
      },
      React.createElement(
        'div',
        { style: { textAlign: 'center', marginBottom: '36px' } },
        React.createElement(
          'div',
          {
            style: {
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 16px',
            },
          },
          '🚒'
        ),
        React.createElement(
          'h1',
          {
            style: {
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '8px',
            },
          },
          'Gestión de Bomberos'
        ),
        React.createElement(
          'p',
          { style: { color: '#6b7280', fontSize: '14px' } },
          'Sistema de gestión integral'
        )
      ),
      React.createElement(
        'form',
        { onSubmit: handleSubmit },
        React.createElement(
          'div',
          { style: { marginBottom: '20px' } },
          React.createElement(
            'label',
            {
              style: {
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              },
            },
            '📧 Email'
          ),
          React.createElement('input', {
            type: 'email',
            value: email,
            onChange: function (e) {
              setEmail(e.target.value);
              setError('');
            },
            style: {
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            },
            placeholder: 'usuario@bomberos.com',
            required: true,
          })
        ),
        React.createElement(
          'div',
          { style: { marginBottom: '24px' } },
          React.createElement(
            'label',
            {
              style: {
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              },
            },
            '🔒 Contraseña'
          ),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: function (e) {
              setPassword(e.target.value);
              setError('');
            },
            style: {
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            },
            placeholder: '••••••••',
            required: true,
          })
        ),
        error &&
          React.createElement(
            'div',
            {
              style: {
                background: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: '600',
              },
            },
            '⚠️ ' + error
          ),
        React.createElement(
          'button',
          {
            type: 'submit',
            style: {
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              letterSpacing: '0.5px',
            },
          },
          '🚒 Ingresar al Sistema'
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
            border: '1px solid #e5e7eb',
          },
        },
        React.createElement(
          'p',
          {
            style: {
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '8px',
              fontWeight: '600',
            },
          },
          '💡 Acceso de prueba'
        ),
        React.createElement(
          'p',
          {
            style: { fontSize: '12px', color: '#9ca3af', textAlign: 'center' },
          },
          'Email: admin@bomberos.com'
        ),
        React.createElement(
          'p',
          {
            style: { fontSize: '12px', color: '#9ca3af', textAlign: 'center' },
          },
          'Contraseña: 1234'
        )
      )
    )
  );
}
// ============================================
// INVENTARIO
// ============================================
function Inventario(props) {
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var filtroState = useState('todos');
  var filtro = filtroState[0];
  var setFiltro = filtroState[1];
  var busquedaState = useState('');
  var busqueda = busquedaState[0];
  var setBusqueda = busquedaState[1];
  var itemSelState = useState(null);
  var itemSel = itemSelState[0];
  var setItemSel = itemSelState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var categorias = ['herramienta', 'equipo', 'material', 'repuesto', 'EPP'];
  var estadoInicial = {
    nombre: '',
    codigo: '',
    categoria: 'herramienta',
    stock: 0,
    stockMinimo: 5,
    estado: 'disponible',
    unidad: 'unidad',
    descripcion: '',
  };
  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];
  var catColores = {
    herramienta: '#3b82f6',
    equipo: '#8b5cf6',
    material: '#10b981',
    repuesto: '#f59e0b',
    EPP: '#ef4444',
  };

  var itemsFiltrados = props.inventario.filter(function (item) {
    var matchFiltro = filtro === 'todos' || item.categoria === filtro;
    var matchBusqueda =
      !busqueda ||
      (item.nombre &&
        item.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (item.codigo &&
        item.codigo.toLowerCase().includes(busqueda.toLowerCase()));
    return matchFiltro && matchBusqueda;
  });

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre || !form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      var id = await props.onAgregar({
        nombre: form.nombre.trim(),
        codigo: form.codigo ? form.codigo.trim() : '',
        categoria: form.categoria,
        stock: parseInt(form.stock) || 0,
        stockMinimo: parseInt(form.stockMinimo) || 5,
        estado: form.estado,
        unidad: form.unidad,
        descripcion: form.descripcion ? form.descripcion.trim() : '',
      });
      if (id) {
        alert('✅ Item guardado');
        setForm(estadoInicial);
        setMostrarForm(false);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  var movimientosItem = itemSel
    ? props.movimientos.filter(function (m) {
        return m.itemId === itemSel.id;
      })
    : [];

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
          flexWrap: 'wrap',
          gap: '12px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '📦 Inventario'),
      React.createElement(
        'button',
        {
          style: Object.assign({}, styles.btnPrimary, {
            background: '#10b981',
          }),
          onClick: function () {
            setMostrarForm(!mostrarForm);
            setForm(estadoInicial);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Item'
      )
    ),

    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        },
      },
      React.createElement('input', {
        type: 'text',
        placeholder: '🔍 Buscar...',
        value: busqueda,
        onChange: function (e) {
          setBusqueda(e.target.value);
        },
        style: Object.assign({}, styles.input, { maxWidth: '260px' }),
      }),
      React.createElement(
        'button',
        {
          style: filtro === 'todos' ? styles.navBtnActive : styles.navBtn,
          onClick: function () {
            setFiltro('todos');
          },
        },
        'Todos (' + props.inventario.length + ')'
      ),
      categorias.map(function (cat) {
        var count = props.inventario.filter(function (i) {
          return i.categoria === cat;
        }).length;
        return React.createElement(
          'button',
          {
            key: cat,
            style:
              filtro === cat
                ? Object.assign({}, styles.navBtnActive, {
                    background: catColores[cat],
                  })
                : styles.navBtn,
            onClick: function () {
              setFiltro(cat);
            },
          },
          cat + ' (' + count + ')'
        );
      })
    ),

    props.itemsBajoStock &&
      props.itemsBajoStock.length > 0 &&
      React.createElement(
        'div',
        {
          style: {
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
          },
        },
        React.createElement(
          'p',
          { style: { color: '#92400e', fontWeight: '600', fontSize: '13px' } },
          '⚠️ ' +
            props.itemsBajoStock.length +
            ' items con stock bajo el mínimo'
        )
      ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0fdf4',
            border: '2px solid #22c55e',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#15803d' }) },
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
                placeholder: 'Ej: Manguera 45mm',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Código'),
              React.createElement('input', {
                type: 'text',
                value: form.codigo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { codigo: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Ej: HER-001',
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
                  setForm(Object.assign({}, form, { stock: e.target.value }));
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
                    Object.assign({}, form, { stockMinimo: e.target.value })
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
              React.createElement(
                'select',
                {
                  value: form.unidad,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { unidad: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                ['unidad', 'litro', 'metro', 'kg', 'par', 'caja'].map(function (
                  u
                ) {
                  return React.createElement('option', { key: u, value: u }, u);
                })
              )
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
                  { value: 'disponible' },
                  'Disponible'
                ),
                React.createElement('option', { value: 'en_uso' }, 'En Uso'),
                React.createElement(
                  'option',
                  { value: 'mantenimiento' },
                  'Mantenimiento'
                ),
                React.createElement('option', { value: 'baja' }, 'Baja')
              )
            ),
            React.createElement(
              'div',
              { style: { gridColumn: '1 / -1' } },
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
                placeholder: 'Descripción opcional...',
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                padding: '14px',
                background: guardando ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
                fontSize: '15px',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Guardar Item'
          )
        )
      ),

    itemSel &&
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
              padding: '24px',
              maxWidth: '640px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
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
              'h3',
              { style: { fontWeight: 'bold', fontSize: '18px' } },
              '📊 Historial: ' + itemSel.nombre
            ),
            React.createElement(
              'button',
              {
                style: {
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                },
                onClick: function () {
                  setItemSel(null);
                },
              },
              '✖ Cerrar'
            )
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  background: '#ecfdf5',
                  padding: '14px',
                  borderRadius: '10px',
                  textAlign: 'center',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#059669',
                  },
                },
                movimientosItem
                  .filter(function (m) {
                    return m.tipo === 'entrada';
                  })
                  .reduce(function (acc, m) {
                    return acc + (m.cantidad || 0);
                  }, 0)
              ),
              React.createElement(
                'div',
                { style: { fontSize: '12px', color: '#6b7280' } },
                'Total Entradas'
              )
            ),
            React.createElement(
              'div',
              {
                style: {
                  background: '#fef2f2',
                  padding: '14px',
                  borderRadius: '10px',
                  textAlign: 'center',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#dc2626',
                  },
                },
                movimientosItem
                  .filter(function (m) {
                    return m.tipo === 'salida';
                  })
                  .reduce(function (acc, m) {
                    return acc + (m.cantidad || 0);
                  }, 0)
              ),
              React.createElement(
                'div',
                { style: { fontSize: '12px', color: '#6b7280' } },
                'Total Salidas'
              )
            )
          ),
          movimientosItem.length === 0
            ? React.createElement(
                'p',
                {
                  style: {
                    color: '#6b7280',
                    textAlign: 'center',
                    padding: '24px',
                  },
                },
                'Sin movimientos registrados'
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
                movimientosItem.map(function (m, i) {
                  return React.createElement(
                    'div',
                    {
                      key: i,
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background:
                          m.tipo === 'entrada' ? '#ecfdf5' : '#fef2f2',
                        borderRadius: '8px',
                        border:
                          '1px solid ' +
                          (m.tipo === 'entrada' ? '#a7f3d0' : '#fecaca'),
                      },
                    },
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
                            marginBottom: '4px',
                          },
                        },
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontSize: '11px',
                              fontWeight: '700',
                              color:
                                m.tipo === 'entrada' ? '#059669' : '#dc2626',
                              background:
                                m.tipo === 'entrada' ? '#d1fae5' : '#fee2e2',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            },
                          },
                          m.tipo === 'entrada' ? '⬆️ ENTRADA' : '⬇️ SALIDA'
                        )
                      ),
                      React.createElement(
                        'p',
                        { style: { fontSize: '12px', color: '#6b7280' } },
                        (m.motivo || '-') + ' | 👤 ' + (m.responsable || '-')
                      ),
                      React.createElement(
                        'p',
                        { style: { fontSize: '11px', color: '#9ca3af' } },
                        m.creadoEn && m.creadoEn.toDate
                          ? m.creadoEn.toDate().toLocaleString()
                          : '-'
                      )
                    ),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: m.tipo === 'entrada' ? '#059669' : '#dc2626',
                        },
                      },
                      (m.tipo === 'entrada' ? '+' : '-') + (m.cantidad || 0)
                    )
                  );
                })
              )
        )
      ),

    itemsFiltrados.length === 0
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
            '📦'
          ),
          React.createElement(
            'h3',
            { style: { color: '#6b7280' } },
            'No hay items' +
              (busqueda ? ' que coincidan con "' + busqueda + '"' : '')
          )
        )
      : React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            },
          },
          itemsFiltrados.map(function (item) {
            var bajoStock = (item.stock || 0) <= (item.stockMinimo || 5);
            var catColor = catColores[item.categoria] || '#6b7280';
            return React.createElement(
              'div',
              {
                key: item.id,
                style: Object.assign({}, styles.card, {
                  border: '2px solid ' + (bajoStock ? '#ef4444' : '#e5e7eb'),
                  marginBottom: '0',
                  position: 'relative',
                }),
              },
              bajoStock &&
                React.createElement(
                  'div',
                  {
                    style: {
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#ef4444',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                    },
                  },
                  '⚠️ BAJO STOCK'
                ),
              React.createElement(
                'div',
                { style: { marginBottom: '12px' } },
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '4px',
                      paddingRight: '80px',
                    },
                  },
                  item.nombre
                ),
                item.codigo &&
                  React.createElement(
                    'p',
                    {
                      style: {
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      },
                    },
                    '🔖 ' + item.codigo
                  ),
                React.createElement(
                  'span',
                  {
                    style: {
                      background: catColor,
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                    },
                  },
                  item.categoria
                ),
                item.descripcion &&
                  React.createElement(
                    'p',
                    {
                      style: {
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginTop: '6px',
                      },
                    },
                    item.descripcion
                  )
              ),
              React.createElement(
                'div',
                {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      background: bajoStock ? '#fee2e2' : '#ecfdf5',
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: bajoStock ? '#dc2626' : '#059669',
                      },
                    },
                    item.stock || 0
                  ),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#6b7280' } },
                    'Stock (' + (item.unidad || 'u') + ')'
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      background: '#f3f4f6',
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#374151',
                      },
                    },
                    item.stockMinimo || 5
                  ),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#6b7280' } },
                    'Stock mínimo'
                  )
                )
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                React.createElement(
                  'button',
                  {
                    style: {
                      flex: 1,
                      padding: '8px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    },
                    onClick: function () {
                      var cant = parseInt(prompt('Cantidad a agregar:'));
                      if (cant && cant > 0) {
                        props.onAgregarStock(
                          item.id,
                          cant,
                          props.usuario ? props.usuario.nombre : 'Admin',
                          'Ingreso manual'
                        );
                      }
                    },
                  },
                  '⬆️ Entrada'
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      flex: 1,
                      padding: '8px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    },
                    onClick: function () {
                      var cant = parseInt(prompt('Cantidad a retirar:'));
                      if (cant && cant > 0) {
                        props.onDescontar(
                          item.id,
                          cant,
                          props.usuario ? props.usuario.nombre : 'Admin',
                          'Retiro manual'
                        );
                      }
                    },
                  },
                  '⬇️ Salida'
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      padding: '8px 10px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    },
                    onClick: function () {
                      setItemSel(item);
                    },
                  },
                  '📊'
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      padding: '8px 10px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
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
            );
          })
        )
  );
}

// ============================================
// PAÑOL
// ============================================
function Panol(props) {
  var tipoMovState = useState('salida');
  var tipoMov = tipoMovState[0];
  var setTipoMov = tipoMovState[1];
  var itemSelState = useState('');
  var itemSel = itemSelState[0];
  var setItemSel = itemSelState[1];
  var cantidadState = useState(1);
  var cantidad = cantidadState[0];
  var setCantidad = cantidadState[1];
  var motivoState = useState('');
  var motivo = motivoState[0];
  var setMotivo = motivoState[1];
  var filtroCatState = useState('todos');
  var filtroCat = filtroCatState[0];
  var setFiltroCat = filtroCatState[1];
  var procesandoState = useState(false);
  var procesando = procesandoState[0];
  var setProcesando = procesandoState[1];

  var itemInventario = props.inventario.find(function (i) {
    return i.id === itemSel;
  });
  var movimientosFiltrados = props.movimientos
    .filter(function (m) {
      return filtroCat === 'todos' || m.tipo === filtroCat;
    })
    .slice(0, 50);
  var totalEntradas = props.movimientos
    .filter(function (m) {
      return m.tipo === 'entrada';
    })
    .reduce(function (acc, m) {
      return acc + (m.cantidad || 0);
    }, 0);
  var totalSalidas = props.movimientos
    .filter(function (m) {
      return m.tipo === 'salida';
    })
    .reduce(function (acc, m) {
      return acc + (m.cantidad || 0);
    }, 0);

  var handleMovimiento = async function (e) {
    e.preventDefault();
    if (!itemSel) {
      alert('Selecciona un item');
      return;
    }
    if (!cantidad || cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    setProcesando(true);
    try {
      if (tipoMov === 'salida') {
        var ok = await props.onDescontar(
          itemSel,
          cantidad,
          props.usuario ? props.usuario.nombre : 'Pañol',
          motivo || 'Retiro desde pañol'
        );
        if (!ok) {
          setProcesando(false);
          return;
        }
      } else {
        await props.onAgregarStock(
          itemSel,
          cantidad,
          props.usuario ? props.usuario.nombre : 'Pañol',
          motivo || 'Ingreso desde pañol'
        );
      }
      setItemSel('');
      setCantidad(1);
      setMotivo('');
      alert('✅ Movimiento registrado correctamente');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement('h2', { style: styles.pageTitle }, '🧰 Pañol'),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        },
      },
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.kpi, {
            background: 'linear-gradient(135deg, #10b981, #059669)',
          }),
        },
        React.createElement('div', { style: { fontSize: '28px' } }, '⬆️'),
        React.createElement(
          'div',
          { style: { fontSize: '28px', fontWeight: 'bold' } },
          totalEntradas
        ),
        React.createElement(
          'div',
          { style: { fontSize: '12px' } },
          'Total Entradas'
        )
      ),
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.kpi, {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          }),
        },
        React.createElement('div', { style: { fontSize: '28px' } }, '⬇️'),
        React.createElement(
          'div',
          { style: { fontSize: '28px', fontWeight: 'bold' } },
          totalSalidas
        ),
        React.createElement(
          'div',
          { style: { fontSize: '12px' } },
          'Total Salidas'
        )
      ),
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.kpi, {
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          }),
        },
        React.createElement('div', { style: { fontSize: '28px' } }, '📦'),
        React.createElement(
          'div',
          { style: { fontSize: '28px', fontWeight: 'bold' } },
          props.inventario.length
        ),
        React.createElement('div', { style: { fontSize: '12px' } }, 'Items')
      ),
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.kpi, {
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          }),
        },
        React.createElement('div', { style: { fontSize: '28px' } }, '📋'),
        React.createElement(
          'div',
          { style: { fontSize: '28px', fontWeight: 'bold' } },
          props.movimientos.length
        ),
        React.createElement(
          'div',
          { style: { fontSize: '12px' } },
          'Total Movimientos'
        )
      )
    ),

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
        '📝 Registrar Movimiento'
      ),
      React.createElement(
        'form',
        { onSubmit: handleMovimiento },
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
          React.createElement(
            'button',
            {
              type: 'button',
              style: {
                flex: 1,
                padding: '12px',
                background: tipoMov === 'salida' ? '#ef4444' : '#e5e7eb',
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
            '⬇️ Salida'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
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
            '⬆️ Entrada'
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            },
          },
          React.createElement(
            'div',
            null,
            React.createElement('label', { style: styles.label }, 'Item *'),
            React.createElement(
              'select',
              {
                value: itemSel,
                onChange: function (e) {
                  setItemSel(e.target.value);
                  setCantidad(1);
                },
                style: styles.input,
                required: true,
              },
              React.createElement(
                'option',
                { value: '' },
                'Seleccionar item...'
              ),
              props.inventario
                .filter(function (i) {
                  return i.estado !== 'baja';
                })
                .map(function (item) {
                  return React.createElement(
                    'option',
                    { key: item.id, value: item.id },
                    item.nombre +
                      ' [' +
                      item.categoria +
                      '] - Stock: ' +
                      (item.stock || 0) +
                      ' ' +
                      (item.unidad || 'u')
                  );
                })
            )
          ),
          React.createElement(
            'div',
            null,
            React.createElement('label', { style: styles.label }, 'Cantidad *'),
            React.createElement('input', {
              type: 'number',
              value: cantidad,
              onChange: function (e) {
                setCantidad(parseInt(e.target.value) || 1);
              },
              style: styles.input,
              min: '1',
              max:
                tipoMov === 'salida' && itemInventario
                  ? itemInventario.stock
                  : 9999,
              required: true,
            })
          )
        ),

        itemInventario &&
          React.createElement(
            'div',
            {
              style: {
                background:
                  tipoMov === 'salida'
                    ? itemInventario.stock <= 0
                      ? '#fee2e2'
                      : '#ecfdf5'
                    : '#ecfdf5',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border:
                  '1px solid ' +
                  (tipoMov === 'salida' && itemInventario.stock <= 0
                    ? '#fecaca'
                    : '#a7f3d0'),
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
                      marginBottom: '2px',
                    },
                  },
                  itemInventario.nombre
                ),
                React.createElement(
                  'p',
                  { style: { fontSize: '12px', color: '#6b7280' } },
                  itemInventario.categoria +
                    ' · ' +
                    (itemInventario.unidad || 'u')
                )
              ),
              React.createElement(
                'div',
                { style: { textAlign: 'right' } },
                React.createElement(
                  'p',
                  {
                    style: {
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color:
                        itemInventario.stock <=
                        (itemInventario.stockMinimo || 5)
                          ? '#dc2626'
                          : '#059669',
                    },
                  },
                  itemInventario.stock || 0
                ),
                React.createElement(
                  'p',
                  { style: { fontSize: '11px', color: '#6b7280' } },
                  'Stock actual'
                ),
                tipoMov === 'salida' &&
                  cantidad > 0 &&
                  React.createElement(
                    'p',
                    {
                      style: {
                        fontSize: '12px',
                        fontWeight: '600',
                        color:
                          (itemInventario.stock || 0) - cantidad < 0
                            ? '#dc2626'
                            : '#374151',
                      },
                    },
                    'Quedarán: ' + ((itemInventario.stock || 0) - cantidad)
                  )
              )
            )
          ),

        React.createElement(
          'div',
          { style: { marginBottom: '16px' } },
          React.createElement(
            'label',
            { style: styles.label },
            'Motivo / Descripción'
          ),
          React.createElement('input', {
            type: 'text',
            value: motivo,
            onChange: function (e) {
              setMotivo(e.target.value);
            },
            style: styles.input,
            placeholder:
              tipoMov === 'salida'
                ? 'Ej: Usado en incendio, asignado a TB-01...'
                : 'Ej: Compra, devolución, reposición...',
          })
        ),

        React.createElement(
          'button',
          {
            type: 'submit',
            disabled:
              procesando ||
              (tipoMov === 'salida' &&
                itemInventario &&
                (itemInventario.stock || 0) <= 0),
            style: {
              width: '100%',
              padding: '14px',
              background: procesando
                ? '#9ca3af'
                : tipoMov === 'salida'
                ? '#ef4444'
                : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '15px',
              cursor: procesando ? 'not-allowed' : 'pointer',
            },
          },
          procesando
            ? '⏳ Procesando...'
            : tipoMov === 'salida'
            ? '⬇️ Registrar Salida'
            : '⬆️ Registrar Entrada'
        )
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
            flexWrap: 'wrap',
            gap: '8px',
          },
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { margin: 0 }) },
          '📜 Historial de Movimientos'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '6px' } },
          React.createElement(
            'button',
            {
              style:
                filtroCat === 'todos' ? styles.navBtnActive : styles.navBtn,
              onClick: function () {
                setFiltroCat('todos');
              },
            },
            'Todos'
          ),
          React.createElement(
            'button',
            {
              style: Object.assign(
                {},
                filtroCat === 'entrada' ? styles.navBtnActive : styles.navBtn,
                filtroCat === 'entrada' ? { background: '#10b981' } : {}
              ),
              onClick: function () {
                setFiltroCat('entrada');
              },
            },
            '⬆️ Entradas'
          ),
          React.createElement(
            'button',
            {
              style: Object.assign(
                {},
                filtroCat === 'salida' ? styles.navBtnActive : styles.navBtn,
                filtroCat === 'salida' ? { background: '#ef4444' } : {}
              ),
              onClick: function () {
                setFiltroCat('salida');
              },
            },
            '⬇️ Salidas'
          )
        )
      ),
      movimientosFiltrados.length === 0
        ? React.createElement(
            'p',
            {
              style: { color: '#6b7280', textAlign: 'center', padding: '32px' },
            },
            'Sin movimientos'
          )
        : React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '600px',
                overflowY: 'auto',
              },
            },
            movimientosFiltrados.map(function (m, i) {
              return React.createElement(
                'div',
                {
                  key: i,
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: m.tipo === 'entrada' ? '#ecfdf5' : '#fef2f2',
                    borderRadius: '8px',
                    border:
                      '1px solid ' +
                      (m.tipo === 'entrada' ? '#a7f3d0' : '#fecaca'),
                  },
                },
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
                        marginBottom: '4px',
                      },
                    },
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '12px',
                          fontWeight: '700',
                          color: m.tipo === 'entrada' ? '#059669' : '#dc2626',
                          background:
                            m.tipo === 'entrada' ? '#d1fae5' : '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        },
                      },
                      m.tipo === 'entrada' ? '⬆️ ENTRADA' : '⬇️ SALIDA'
                    ),
                    React.createElement(
                      'span',
                      { style: { fontSize: '13px', fontWeight: '600' } },
                      m.itemNombre || '-'
                    )
                  ),
                  React.createElement(
                    'p',
                    { style: { fontSize: '12px', color: '#6b7280' } },
                    (m.motivo || '-') + ' | 👤 ' + (m.responsable || '-')
                  ),
                  React.createElement(
                    'p',
                    { style: { fontSize: '11px', color: '#9ca3af' } },
                    m.creadoEn && m.creadoEn.toDate
                      ? m.creadoEn.toDate().toLocaleString()
                      : '-'
                  )
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: m.tipo === 'entrada' ? '#059669' : '#dc2626',
                    },
                  },
                  (m.tipo === 'entrada' ? '+' : '-') + (m.cantidad || 0)
                )
              );
            })
          )
    )
  );
}

// ============================================
// EQUIPOS
// ============================================
function Equipos(props) {
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var equipoSelState = useState(null);
  var equipoSel = equipoSelState[0];
  var setEquipoSel = equipoSelState[1];
  var mostrarBitacoraState = useState(false);
  var mostrarBitacora = mostrarBitacoraState[0];
  var setMostrarBitacora = mostrarBitacoraState[1];
  var filtroEstadoState = useState('todos');
  var filtroEstado = filtroEstadoState[0];
  var setFiltroEstado = filtroEstadoState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var estadoInicial = {
    nombre: '',
    codigo: '',
    estado: 'operativo',
    categoria: 'equipo',
    vehiculoId: '',
    proximoMantenimiento: '',
    descripcion: '',
    itemInventarioId: '',
  };
  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];
  var formBitacoraInicial = {
    tipo: 'preventivo',
    observaciones: '',
    responsable: '',
    fecha: new Date().toISOString().split('T')[0],
  };
  var formBitacoraState = useState(formBitacoraInicial);
  var formBitacora = formBitacoraState[0];
  var setFormBitacora = formBitacoraState[1];

  var estadoColores = {
    operativo: '#10b981',
    mantenimiento: '#f59e0b',
    fuera_servicio: '#ef4444',
    baja: '#6b7280',
  };
  var estadoLabels = {
    operativo: '✅ Operativo',
    mantenimiento: '🔧 Mantenimiento',
    fuera_servicio: '❌ Fuera de Servicio',
    baja: '🗑️ Baja',
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

  var equiposFiltrados = props.equipos.filter(function (eq) {
    return filtroEstado === 'todos' || eq.estado === filtroEstado;
  });

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!form.codigo.trim()) {
      alert('El código es obligatorio');
      return;
    }
    var dup = props.equipos.find(function (eq) {
      return (
        eq.codigo &&
        form.codigo &&
        eq.codigo.toLowerCase() === form.codigo.toLowerCase()
      );
    });
    if (dup) {
      alert('Ya existe un equipo con el código: ' + form.codigo);
      return;
    }
    setGuardando(true);
    try {
      var id = await props.onAgregar(Object.assign({}, form, { bitacora: [] }));
      if (id) {
        alert('✅ Equipo guardado');
        setForm(estadoInicial);
        setMostrarForm(false);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  var agregarEntradaBitacora = async function (equipoId) {
    if (!formBitacora.responsable.trim()) {
      alert('El responsable es obligatorio');
      return;
    }
    var equipo = props.equipos.find(function (eq) {
      return eq.id === equipoId;
    });
    if (!equipo) return;
    var nuevaBitacora = (equipo.bitacora || []).concat([
      Object.assign({}, formBitacora, {
        id: Date.now(),
        registradoEn: new Date().toISOString(),
      }),
    ]);
    await props.onActualizar(equipoId, { bitacora: nuevaBitacora });
    setFormBitacora(formBitacoraInicial);
    alert('✅ Entrada registrada');
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
          flexWrap: 'wrap',
          gap: '12px',
        },
      },
      React.createElement('h2', { style: styles.pageTitle }, '🧯 Equipos'),
      React.createElement(
        'button',
        {
          style: styles.btnPrimary,
          onClick: function () {
            setMostrarForm(!mostrarForm);
            setForm(estadoInicial);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nuevo Equipo'
      )
    ),

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
      ['todos', 'operativo', 'mantenimiento', 'fuera_servicio', 'baja'].map(
        function (est) {
          var count =
            est === 'todos'
              ? props.equipos.length
              : props.equipos.filter(function (eq) {
                  return eq.estado === est;
                }).length;
          return React.createElement(
            'button',
            {
              key: est,
              style: Object.assign(
                {},
                filtroEstado === est ? styles.navBtnActive : styles.navBtn,
                filtroEstado === est && est !== 'todos'
                  ? { background: estadoColores[est] }
                  : {}
              ),
              onClick: function () {
                setFiltroEstado(est);
              },
            },
            (est === 'todos' ? 'Todos' : estadoLabels[est]) + ' (' + count + ')'
          );
        }
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#fff7ed',
            border: '2px solid #fb923c',
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
              React.createElement('label', { style: styles.label }, 'Código *'),
              React.createElement('input', {
                type: 'text',
                value: form.codigo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { codigo: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Ej: EXT-001',
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
                ['equipo', 'herramienta', 'EPP', 'material', 'otro'].map(
                  function (c) {
                    return React.createElement(
                      'option',
                      { key: c, value: c },
                      c
                    );
                  }
                )
              )
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
                Object.entries(estadoLabels).map(function (e) {
                  return React.createElement(
                    'option',
                    { key: e[0], value: e[0] },
                    e[1]
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
                'Asignar a Móvil'
              ),
              React.createElement(
                'select',
                {
                  value: form.vehiculoId,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { vehiculoId: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: '' }, 'Sin asignar'),
                props.vehiculos.map(function (v) {
                  return React.createElement(
                    'option',
                    { key: v.id, value: v.id },
                    v.nombre
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
                'Vincular Inventario'
              ),
              React.createElement(
                'select',
                {
                  value: form.itemInventarioId,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        itemInventarioId: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: '' }, 'Sin vincular'),
                props.inventario.map(function (item) {
                  return React.createElement(
                    'option',
                    { key: item.id, value: item.id },
                    item.nombre
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
                'Próx. Mantenimiento'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.proximoMantenimiento,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      proximoMantenimiento: e.target.value,
                    })
                  );
                },
                style: styles.input,
              })
            ),
            React.createElement(
              'div',
              { style: { gridColumn: '1 / -1' } },
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
                placeholder: 'Descripción del equipo...',
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                padding: '14px',
                background: guardando ? '#9ca3af' : '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
                fontSize: '15px',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Guardar Equipo'
          )
        )
      ),

    mostrarBitacora &&
      equipoSel &&
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
              padding: '24px',
              maxWidth: '680px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
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
              'h3',
              { style: { fontWeight: 'bold', fontSize: '18px' } },
              '📋 Bitácora: ' + equipoSel.nombre
            ),
            React.createElement(
              'button',
              {
                style: {
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                },
                onClick: function () {
                  setMostrarBitacora(false);
                  setEquipoSel(null);
                },
              },
              '✖ Cerrar'
            )
          ),
          React.createElement(
            'div',
            {
              style: {
                background: '#f0fdf4',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid #bbf7d0',
              },
            },
            React.createElement(
              'h4',
              {
                style: {
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#15803d',
                },
              },
              '➕ Nueva Entrada'
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '12px',
                },
              },
              React.createElement(
                'div',
                null,
                React.createElement('label', { style: styles.label }, 'Tipo'),
                React.createElement(
                  'select',
                  {
                    value: formBitacora.tipo,
                    onChange: function (e) {
                      setFormBitacora(
                        Object.assign({}, formBitacora, {
                          tipo: e.target.value,
                        })
                      );
                    },
                    style: styles.input,
                  },
                  React.createElement(
                    'option',
                    { value: 'preventivo' },
                    'Mantenimiento Preventivo'
                  ),
                  React.createElement(
                    'option',
                    { value: 'correctivo' },
                    'Mantenimiento Correctivo'
                  ),
                  React.createElement(
                    'option',
                    { value: 'inspeccion' },
                    'Inspección'
                  ),
                  React.createElement(
                    'option',
                    { value: 'reparacion' },
                    'Reparación'
                  ),
                  React.createElement('option', { value: 'otro' }, 'Otro')
                )
              ),
              React.createElement(
                'div',
                null,
                React.createElement('label', { style: styles.label }, 'Fecha'),
                React.createElement('input', {
                  type: 'date',
                  value: formBitacora.fecha,
                  onChange: function (e) {
                    setFormBitacora(
                      Object.assign({}, formBitacora, { fecha: e.target.value })
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
                  'Responsable *'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: formBitacora.responsable,
                  onChange: function (e) {
                    setFormBitacora(
                      Object.assign({}, formBitacora, {
                        responsable: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Nombre del responsable',
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
                  value: formBitacora.observaciones,
                  onChange: function (e) {
                    setFormBitacora(
                      Object.assign({}, formBitacora, {
                        observaciones: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Detalles...',
                })
              )
            ),
            React.createElement(
              'button',
              {
                style: {
                  width: '100%',
                  padding: '10px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                },
                onClick: function () {
                  agregarEntradaBitacora(equipoSel.id);
                },
              },
              '💾 Registrar Entrada'
            )
          ),
          (equipoSel.bitacora || []).length === 0
            ? React.createElement(
                'p',
                {
                  style: {
                    color: '#6b7280',
                    textAlign: 'center',
                    padding: '24px',
                  },
                },
                'Sin registros en bitácora'
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
                (equipoSel.bitacora || [])
                  .slice()
                  .reverse()
                  .map(function (entrada, i) {
                    var tipoColores = {
                      preventivo: '#3b82f6',
                      correctivo: '#ef4444',
                      inspeccion: '#10b981',
                      reparacion: '#f59e0b',
                      otro: '#6b7280',
                    };
                    return React.createElement(
                      'div',
                      {
                        key: i,
                        style: {
                          padding: '14px',
                          background: '#f9fafb',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          borderLeft:
                            '4px solid ' +
                            (tipoColores[entrada.tipo] || '#6b7280'),
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          },
                        },
                        React.createElement(
                          'span',
                          {
                            style: {
                              fontWeight: '700',
                              fontSize: '12px',
                              color: tipoColores[entrada.tipo] || '#6b7280',
                              textTransform: 'uppercase',
                            },
                          },
                          entrada.tipo
                        ),
                        React.createElement(
                          'span',
                          { style: { fontSize: '12px', color: '#6b7280' } },
                          entrada.fecha || '-'
                        )
                      ),
                      React.createElement(
                        'p',
                        {
                          style: {
                            fontSize: '13px',
                            color: '#374151',
                            marginBottom: '4px',
                          },
                        },
                        entrada.observaciones || 'Sin observaciones'
                      ),
                      React.createElement(
                        'p',
                        { style: { fontSize: '12px', color: '#9ca3af' } },
                        '👤 ' + (entrada.responsable || '-')
                      )
                    );
                  })
              )
        )
      ),

    equiposFiltrados.length === 0
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
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '16px',
            },
          },
          equiposFiltrados.map(function (eq) {
            var vehiculo = props.vehiculos.find(function (v) {
              return v.id === eq.vehiculoId;
            });
            var itemInv = props.inventario.find(function (i) {
              return i.id === eq.itemInventarioId;
            });
            var estadoColor = estadoColores[eq.estado] || '#6b7280';
            var estadoLabel = estadoLabels[eq.estado] || eq.estado;
            var vencMant = verificarVencimiento(eq.proximoMantenimiento);

            return React.createElement(
              'div',
              {
                key: eq.id,
                style: Object.assign({}, styles.card, {
                  border:
                    '2px solid ' +
                    (vencMant === 'vencido'
                      ? '#ef4444'
                      : vencMant === 'proximo'
                      ? '#f59e0b'
                      : '#e5e7eb'),
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
                    marginBottom: '12px',
                  },
                },
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
                    eq.nombre
                  ),
                  eq.codigo &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '2px',
                        },
                      },
                      '🔖 ' + eq.codigo
                    ),
                  eq.descripcion &&
                    React.createElement(
                      'p',
                      { style: { fontSize: '12px', color: '#9ca3af' } },
                      eq.descripcion
                    )
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      background: estadoColor,
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    },
                  },
                  estadoLabel
                )
              ),

              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '14px',
                  },
                },
                vehiculo &&
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#eff6ff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                      },
                    },
                    React.createElement('span', null, '🚛'),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e40af',
                        },
                      },
                      vehiculo.nombre + ' - ' + vehiculo.tipo
                    )
                  ),
                itemInv &&
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f0fdf4',
                        padding: '8px 12px',
                        borderRadius: '8px',
                      },
                    },
                    React.createElement('span', null, '📦'),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#15803d',
                        },
                      },
                      itemInv.nombre + ' [Stock: ' + (itemInv.stock || 0) + ']'
                    )
                  ),
                eq.proximoMantenimiento &&
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background:
                          vencMant === 'vencido'
                            ? '#fef2f2'
                            : vencMant === 'proximo'
                            ? '#fffbeb'
                            : '#f9fafb',
                        padding: '8px 12px',
                        borderRadius: '8px',
                      },
                    },
                    React.createElement('span', null, '📅'),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '13px',
                          fontWeight: '600',
                          color:
                            vencMant === 'vencido'
                              ? '#dc2626'
                              : vencMant === 'proximo'
                              ? '#d97706'
                              : '#374151',
                        },
                      },
                      'Próx. Mant: ' +
                        eq.proximoMantenimiento +
                        (vencMant === 'vencido'
                          ? ' ⚠️ VENCIDO'
                          : vencMant === 'proximo'
                          ? ' ⚠️ PRÓXIMO'
                          : '')
                    )
                  )
              ),

              React.createElement(
                'div',
                {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '12px',
                  },
                },
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Estado'
                  ),
                  React.createElement(
                    'select',
                    {
                      value: eq.estado,
                      onChange: function (e) {
                        props.onActualizar(eq.id, { estado: e.target.value });
                      },
                      style: {
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                      },
                    },
                    Object.entries(estadoLabels).map(function (e) {
                      return React.createElement(
                        'option',
                        { key: e[0], value: e[0] },
                        e[1]
                      );
                    })
                  )
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Próx. Mantenimiento'
                  ),
                  React.createElement('input', {
                    type: 'date',
                    value: eq.proximoMantenimiento || '',
                    onChange: function (e) {
                      props.onActualizar(eq.id, {
                        proximoMantenimiento: e.target.value,
                      });
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border:
                        '1px solid ' +
                        (vencMant === 'vencido'
                          ? '#ef4444'
                          : vencMant === 'proximo'
                          ? '#f59e0b'
                          : '#d1d5db'),
                      borderRadius: '6px',
                      fontSize: '12px',
                      background:
                        vencMant === 'vencido'
                          ? '#fef2f2'
                          : vencMant === 'proximo'
                          ? '#fffbeb'
                          : 'white',
                    },
                  })
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Asignar a Móvil'
                  ),
                  React.createElement(
                    'select',
                    {
                      value: eq.vehiculoId || '',
                      onChange: function (e) {
                        props.onActualizar(eq.id, {
                          vehiculoId: e.target.value,
                        });
                      },
                      style: {
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                      },
                    },
                    React.createElement('option', { value: '' }, 'Sin asignar'),
                    props.vehiculos.map(function (v) {
                      return React.createElement(
                        'option',
                        { key: v.id, value: v.id },
                        v.nombre
                      );
                    })
                  )
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Vincular Inventario'
                  ),
                  React.createElement(
                    'select',
                    {
                      value: eq.itemInventarioId || '',
                      onChange: function (e) {
                        props.onActualizar(eq.id, {
                          itemInventarioId: e.target.value,
                        });
                      },
                      style: {
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                      },
                    },
                    React.createElement(
                      'option',
                      { value: '' },
                      'Sin vincular'
                    ),
                    props.inventario.map(function (item) {
                      return React.createElement(
                        'option',
                        { key: item.id, value: item.id },
                        item.nombre
                      );
                    })
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
                      flex: 1,
                      padding: '9px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    },
                    onClick: function () {
                      setEquipoSel(eq);
                      setMostrarBitacora(true);
                      setFormBitacora(formBitacoraInicial);
                    },
                  },
                  '📋 Bitácora (' + (eq.bitacora || []).length + ')'
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      padding: '9px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    },
                    onClick: function () {
                      if (
                        window.confirm('¿Eliminar equipo ' + eq.nombre + '?')
                      ) {
                        props.onEliminar(eq.id);
                      }
                    },
                  },
                  '🗑️'
                )
              )
            );
          })
        )
  );
}

// ============================================
// ERAs
// ============================================
function ERAs(props) {
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var estadoInicial = {
    marca: '',
    modelo: '',
    serial: '',
    presion: 300,
    estado: 'activo',
    pruebaHidraulica: '',
    vencimientoTubo: '',
    proximoMantenimiento: '',
    proveedorRazonSocial: '',
    proveedorTelefono: '',
    proveedorDireccion: '',
  };
  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var getBorderColor = function (est) {
    return est === 'vencido'
      ? '#ef4444'
      : est === 'proximo'
      ? '#f59e0b'
      : '#d1d5db';
  };
  var getBgColor = function (est) {
    return est === 'vencido'
      ? '#fef2f2'
      : est === 'proximo'
      ? '#fffbeb'
      : 'white';
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.marca.trim()) {
      alert('La marca es obligatoria');
      return;
    }
    if (!form.modelo.trim()) {
      alert('El modelo es obligatorio');
      return;
    }
    if (!form.serial.trim()) {
      alert('El serial es obligatorio');
      return;
    }
    var duplicado = props.eras.find(function (era) {
      return (
        era.serial &&
        form.serial &&
        era.serial.toLowerCase() === form.serial.toLowerCase()
      );
    });
    if (duplicado) {
      alert('Ya existe una ERA con el serial: ' + form.serial);
      return;
    }
    setGuardando(true);
    try {
      var id = await props.onAgregar({
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        serial: form.serial.trim(),
        presion: parseInt(form.presion) || 300,
        estado: form.estado,
        pruebaHidraulica: form.pruebaHidraulica || '',
        vencimientoTubo: form.vencimientoTubo || '',
        proximoMantenimiento: form.proximoMantenimiento || '',
        proveedorRazonSocial: form.proveedorRazonSocial || '',
        proveedorTelefono: form.proveedorTelefono || '',
        proveedorDireccion: form.proveedorDireccion || '',
        vehiculoAsignado: '',
      });
      if (id) {
        alert('✅ ERA guardada');
        setForm(estadoInicial);
        setMostrarForm(false);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
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
            setForm(estadoInicial);
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
            border: '2px solid #8b5cf6',
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
                placeholder: 'Ej: Scott',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Modelo *'),
              React.createElement('input', {
                type: 'text',
                value: form.modelo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { modelo: e.target.value }));
                },
                style: styles.input,
                required: true,
                placeholder: 'Ej: Air-Pak X3',
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
                placeholder: 'Ej: SN-001234',
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
                  setForm(Object.assign({}, form, { presion: e.target.value }));
                },
                style: styles.input,
                min: '0',
                max: '400',
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
                  'Mantenimiento'
                ),
                React.createElement('option', { value: 'retirado' }, 'Retirado')
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
                'Vencimiento Tubo'
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
                'Próx. Mantenimiento'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.proximoMantenimiento,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, {
                      proximoMantenimiento: e.target.value,
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
                background: '#eff6ff',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '16px',
                border: '1px solid #bfdbfe',
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
                  'Razón Social'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedorRazonSocial,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedorRazonSocial: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Empresa S.A.',
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
                  value: form.proveedorTelefono,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedorTelefono: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: '+54 11 1234-5678',
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  { style: styles.label },
                  'Dirección'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: form.proveedorDireccion,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, {
                        proveedorDireccion: e.target.value,
                      })
                    );
                  },
                  style: styles.input,
                  placeholder: 'Av. Ejemplo 1234',
                })
              )
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                background: guardando ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: guardando ? 'not-allowed' : 'pointer',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Agregar ERA'
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
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '16px',
            },
          },
          props.eras.map(function (era) {
            var vencPH = verificarVencimiento(era.pruebaHidraulica);
            var vencTubo = verificarVencimiento(era.vencimientoTubo);
            var vencMant = verificarVencimiento(era.proximoMantenimiento);
            var tieneAlerta =
              vencPH === 'vencido' ||
              vencTubo === 'vencido' ||
              vencMant === 'vencido';
            var tieneProximo =
              vencPH === 'proximo' ||
              vencTubo === 'proximo' ||
              vencMant === 'proximo';
            var vehiculoAsig = era.vehiculoAsignado
              ? props.vehiculos.find(function (v) {
                  return v.id === era.vehiculoAsignado;
                })
              : null;

            return React.createElement(
              'div',
              {
                key: era.id,
                style: Object.assign({}, styles.card, {
                  border:
                    '2px solid ' +
                    (tieneAlerta
                      ? '#ef4444'
                      : tieneProximo
                      ? '#f59e0b'
                      : '#e5e7eb'),
                  marginBottom: '0',
                }),
              },
              React.createElement(
                'div',
                { style: { textAlign: 'center', marginBottom: '16px' } },
                React.createElement(
                  'div',
                  {
                    style: {
                      width: '64px',
                      height: '64px',
                      background:
                        era.estado === 'activo'
                          ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                          : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      margin: '0 auto 10px',
                    },
                  },
                  '🎽'
                ),
                React.createElement(
                  'h3',
                  {
                    style: {
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    },
                  },
                  era.marca + ' ' + era.modelo
                ),
                React.createElement(
                  'p',
                  {
                    style: {
                      color: '#8b5cf6',
                      fontWeight: '600',
                      fontSize: '13px',
                    },
                  },
                  '🔖 Serial: ' + era.serial
                ),
                vehiculoAsig &&
                  React.createElement(
                    'div',
                    {
                      style: {
                        background: '#eff6ff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        marginTop: '8px',
                        display: 'inline-block',
                      },
                    },
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '12px',
                          color: '#1e40af',
                          fontWeight: '600',
                        },
                      },
                      '🚛 Asignada a: ' + vehiculoAsig.nombre
                    )
                  )
              ),

              React.createElement(
                'div',
                {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '14px',
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      padding: '10px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      textAlign: 'center',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color:
                          (era.presion || 0) >= 280 ? '#10b981' : '#ef4444',
                      },
                    },
                    (era.presion || 0) + ' bar'
                  ),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#6b7280' } },
                    'Presión'
                  )
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      padding: '10px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      textAlign: 'center',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: era.estado === 'activo' ? '#10b981' : '#f59e0b',
                      },
                    },
                    era.estado === 'activo'
                      ? '✅ ACTIVO'
                      : '🔧 ' + (era.estado || '').toUpperCase()
                  ),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#6b7280' } },
                    'Estado'
                  )
                )
              ),

              React.createElement(
                'div',
                {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '12px',
                  },
                },
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Estado'
                  ),
                  React.createElement(
                    'select',
                    {
                      value: era.estado,
                      onChange: function (e) {
                        props.onActualizar(era.id, { estado: e.target.value });
                      },
                      style: {
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                      },
                    },
                    React.createElement(
                      'option',
                      { value: 'activo' },
                      'Activo'
                    ),
                    React.createElement(
                      'option',
                      { value: 'mantenimiento' },
                      'Mantenimiento'
                    ),
                    React.createElement(
                      'option',
                      { value: 'retirado' },
                      'Retirado'
                    )
                  )
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Presión (bar)'
                  ),
                  React.createElement('input', {
                    type: 'number',
                    value: era.presion || '',
                    onChange: function (e) {
                      props.onActualizar(era.id, {
                        presion: parseInt(e.target.value) || 0,
                      });
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                    },
                    min: '0',
                    max: '400',
                  })
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Prueba Hidráulica'
                  ),
                  React.createElement('input', {
                    type: 'date',
                    value: era.pruebaHidraulica || '',
                    onChange: function (e) {
                      props.onActualizar(era.id, {
                        pruebaHidraulica: e.target.value,
                      });
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border: '1px solid ' + getBorderColor(vencPH),
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: getBgColor(vencPH),
                    },
                  }),
                  vencPH === 'vencido' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#dc2626',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ VENCIDA'
                    ),
                  vencPH === 'proximo' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#d97706',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ Próxima'
                    )
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Venc. Tubo'
                  ),
                  React.createElement('input', {
                    type: 'date',
                    value: era.vencimientoTubo || '',
                    onChange: function (e) {
                      props.onActualizar(era.id, {
                        vencimientoTubo: e.target.value,
                      });
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border: '1px solid ' + getBorderColor(vencTubo),
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: getBgColor(vencTubo),
                    },
                  }),
                  vencTubo === 'vencido' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#dc2626',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ VENCIDO'
                    ),
                  vencTubo === 'proximo' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#d97706',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ Próximo'
                    )
                ),
                React.createElement(
                  'div',
                  { style: { gridColumn: '1 / -1' } },
                  React.createElement(
                    'label',
                    {
                      style: {
                        fontSize: '11px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '3px',
                      },
                    },
                    'Próx. Mantenimiento'
                  ),
                  React.createElement('input', {
                    type: 'date',
                    value: era.proximoMantenimiento || '',
                    onChange: function (e) {
                      props.onActualizar(era.id, {
                        proximoMantenimiento: e.target.value,
                      });
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border: '1px solid ' + getBorderColor(vencMant),
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: getBgColor(vencMant),
                    },
                  }),
                  vencMant === 'vencido' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#dc2626',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ VENCIDO'
                    ),
                  vencMant === 'proximo' &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#d97706',
                          marginTop: '2px',
                          fontWeight: '600',
                        },
                      },
                      '⚠️ Próximo'
                    )
                )
              ),

              React.createElement(
                'div',
                { style: { marginBottom: '12px' } },
                React.createElement(
                  'label',
                  {
                    style: {
                      fontSize: '11px',
                      color: '#6b7280',
                      display: 'block',
                      marginBottom: '3px',
                    },
                  },
                  '🚛 Asignar a Móvil'
                ),
                React.createElement(
                  'select',
                  {
                    value: era.vehiculoAsignado || '',
                    onChange: function (e) {
                      if (e.target.value) {
                        props.onAsignarERA(e.target.value, era.id);
                      } else {
                        if (era.vehiculoAsignado) {
                          props.onDesasignarERA(era.vehiculoAsignado, era.id);
                        }
                      }
                    },
                    style: {
                      width: '100%',
                      padding: '7px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                    },
                  },
                  React.createElement('option', { value: '' }, 'Sin asignar'),
                  props.vehiculos.map(function (v) {
                    return React.createElement(
                      'option',
                      { key: v.id, value: v.id },
                      v.nombre + ' - ' + v.tipo
                    );
                  })
                )
              ),

              (era.proveedorRazonSocial ||
                era.proveedorTelefono ||
                era.proveedorDireccion) &&
                React.createElement(
                  'div',
                  {
                    style: {
                      background: '#eff6ff',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid #bfdbfe',
                    },
                  },
                  React.createElement(
                    'p',
                    {
                      style: {
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#1e40af',
                        marginBottom: '6px',
                      },
                    },
                    '🏢 Proveedor'
                  ),
                  era.proveedorRazonSocial &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '12px',
                          color: '#1e40af',
                          marginBottom: '2px',
                        },
                      },
                      era.proveedorRazonSocial
                    ),
                  era.proveedorTelefono &&
                    React.createElement(
                      'p',
                      {
                        style: {
                          fontSize: '12px',
                          color: '#1e40af',
                          marginBottom: '2px',
                        },
                      },
                      '📞 ' + era.proveedorTelefono
                    ),
                  era.proveedorDireccion &&
                    React.createElement(
                      'p',
                      { style: { fontSize: '12px', color: '#1e40af' } },
                      '📍 ' + era.proveedorDireccion
                    )
                ),

              React.createElement(
                'button',
                {
                  style: {
                    width: '100%',
                    padding: '10px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  },
                  onClick: function () {
                    if (
                      window.confirm(
                        '¿Eliminar ERA ' +
                          era.marca +
                          ' ' +
                          era.modelo +
                          ' [' +
                          era.serial +
                          ']?'
                      )
                    ) {
                      props.onEliminar(era.id);
                    }
                  },
                },
                '🗑️ Eliminar ERA'
              )
            );
          })
        )
  );
}

// ============================================
// PERSONAL
// ============================================
function Personal(props) {
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var estadoInicial = {
    nombre: '',
    apellido: '',
    cargo: '',
    licencia: '',
    categoria: '',
    telefono: '',
    email: '',
  };
  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];

  var verificarVencimiento = function (fecha) {
    if (!fecha) return '';
    var dias = Math.ceil(
      (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'proximo';
    return 'ok';
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!form.apellido.trim()) {
      alert('El apellido es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      var id = await props.onAgregar({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        cargo: form.cargo || '',
        licencia: form.licencia || '',
        categoria: form.categoria || '',
        telefono: form.telefono || '',
        email: form.email || '',
      });
      if (id) {
        alert('✅ Personal agregado');
        setForm(estadoInicial);
        setMostrarForm(false);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
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
            setForm(estadoInicial);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Agregar Personal'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#f0fdf4',
            border: '2px solid #22c55e',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#15803d' }) },
          '➕ Nuevo Integrante'
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
                placeholder: 'Juan',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Apellido *'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.apellido,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { apellido: e.target.value })
                  );
                },
                style: styles.input,
                required: true,
                placeholder: 'Pérez',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Cargo'),
              React.createElement('input', {
                type: 'text',
                value: form.cargo,
                onChange: function (e) {
                  setForm(Object.assign({}, form, { cargo: e.target.value }));
                },
                style: styles.input,
                placeholder: 'Bombero 1°',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Teléfono'),
              React.createElement('input', {
                type: 'tel',
                value: form.telefono,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { telefono: e.target.value })
                  );
                },
                style: styles.input,
                placeholder: '+54 11 1234-5678',
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
                placeholder: 'juan@bomberos.com',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Categoría Licencia'
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
                React.createElement('option', { value: '' }, 'Seleccionar...'),
                ['A', 'B', 'C', 'D', 'E'].map(function (c) {
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
                'Vencimiento Licencia'
              ),
              React.createElement('input', {
                type: 'date',
                value: form.licencia,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { licencia: e.target.value })
                  );
                },
                style: styles.input,
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                padding: '12px',
                background: guardando ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: guardando ? 'not-allowed' : 'pointer',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Agregar Personal'
          )
        )
      ),

    props.personal.length === 0
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
          { style: { overflowX: 'auto' } },
          React.createElement(
            'table',
            {
              style: {
                width: '100%',
                borderCollapse: 'collapse',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                { style: { background: '#f3f4f6' } },
                [
                  'Nombre',
                  'Apellido',
                  'Cargo',
                  'Teléfono',
                  'Email',
                  'Categoría',
                  'Venc. Licencia',
                  'Acciones',
                ].map(function (h) {
                  return React.createElement(
                    'th',
                    {
                      key: h,
                      style: {
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: '#374151',
                        whiteSpace: 'nowrap',
                      },
                    },
                    h
                  );
                })
              )
            ),
            React.createElement(
              'tbody',
              null,
              props.personal.map(function (p, idx) {
                var estadoLic = verificarVencimiento(p.licencia);
                return React.createElement(
                  'tr',
                  {
                    key: p.id,
                    style: {
                      borderBottom: '1px solid #e5e7eb',
                      background: idx % 2 === 0 ? 'white' : '#f9fafb',
                    },
                  },
                  React.createElement(
                    'td',
                    { style: { padding: '12px 16px', fontWeight: '500' } },
                    p.nombre
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '12px 16px' } },
                    p.apellido
                  ),
                  React.createElement(
                    'td',
                    {
                      style: {
                        padding: '12px 16px',
                        color: '#6b7280',
                        fontSize: '13px',
                      },
                    },
                    p.cargo || '-'
                  ),
                  React.createElement(
                    'td',
                    {
                      style: {
                        padding: '12px 16px',
                        color: '#6b7280',
                        fontSize: '13px',
                      },
                    },
                    p.telefono || '-'
                  ),
                  React.createElement(
                    'td',
                    {
                      style: {
                        padding: '12px 16px',
                        color: '#6b7280',
                        fontSize: '13px',
                      },
                    },
                    p.email || '-'
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '12px 16px' } },
                    p.categoria
                      ? React.createElement(
                          'span',
                          {
                            style: {
                              background: '#3b82f6',
                              color: 'white',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            },
                          },
                          'Cat. ' + p.categoria
                        )
                      : React.createElement(
                          'span',
                          { style: { color: '#9ca3af' } },
                          '-'
                        )
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '12px 16px' } },
                    React.createElement(
                      'div',
                      null,
                      React.createElement('input', {
                        type: 'date',
                        value: p.licencia || '',
                        onChange: function (e) {
                          props.onActualizar(p.id, {
                            licencia: e.target.value,
                          });
                        },
                        style: {
                          padding: '6px',
                          fontSize: '12px',
                          border:
                            '1px solid ' +
                            (estadoLic === 'vencido'
                              ? '#ef4444'
                              : estadoLic === 'proximo'
                              ? '#f59e0b'
                              : '#d1d5db'),
                          borderRadius: '6px',
                          background:
                            estadoLic === 'vencido'
                              ? '#fef2f2'
                              : estadoLic === 'proximo'
                              ? '#fffbeb'
                              : 'white',
                        },
                      }),
                      estadoLic === 'vencido' &&
                        React.createElement(
                          'p',
                          {
                            style: {
                              fontSize: '10px',
                              color: '#ef4444',
                              marginTop: '2px',
                              fontWeight: '600',
                            },
                          },
                          '⚠️ VENCIDA'
                        ),
                      estadoLic === 'proximo' &&
                        React.createElement(
                          'p',
                          {
                            style: {
                              fontSize: '10px',
                              color: '#f59e0b',
                              marginTop: '2px',
                              fontWeight: '600',
                            },
                          },
                          '⚠️ Próxima'
                        )
                    )
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '12px 16px' } },
                    React.createElement(
                      'button',
                      {
                        style: {
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        },
                        onClick: function () {
                          if (
                            window.confirm(
                              '¿Eliminar a ' + p.nombre + ' ' + p.apellido + '?'
                            )
                          ) {
                            props.onEliminar(p.id);
                          }
                        },
                      },
                      '🗑️ Eliminar'
                    )
                  )
                );
              })
            )
          )
        )
  );
}

// ============================================
// BITACORA
// ============================================
function Bitacora(props) {
  var mostrarFormState = useState(false);
  var mostrarForm = mostrarFormState[0];
  var setMostrarForm = mostrarFormState[1];
  var filtroState = useState('todos');
  var filtro = filtroState[0];
  var setFiltro = filtroState[1];
  var guardandoState = useState(false);
  var guardando = guardandoState[0];
  var setGuardando = guardandoState[1];
  var estadoInicial = {
    tipo: 'Mantenimiento',
    descripcion: '',
    responsable: '',
    vehiculoId: '',
    eraId: '',
  };
  var formState = useState(estadoInicial);
  var form = formState[0];
  var setForm = formState[1];

  var tipos = [
    'Mantenimiento',
    'Reparacion',
    'Inspeccion',
    'Carga de Combustible',
    'Cambio de Aceite',
    'Cambio de Bateria',
    'Emergencia',
    'Otro',
  ];
  var tipoColores = {
    Mantenimiento: '#3b82f6',
    Reparacion: '#ef4444',
    Inspeccion: '#10b981',
    'Carga de Combustible': '#f59e0b',
    'Cambio de Aceite': '#8b5cf6',
    'Cambio de Bateria': '#06b6d4',
    Emergencia: '#dc2626',
    Otro: '#6b7280',
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      alert('La descripción es obligatoria');
      return;
    }
    if (!form.responsable.trim()) {
      alert('El responsable es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      var id = await props.onAgregar({
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        responsable: form.responsable.trim(),
        vehiculoId: form.vehiculoId || '',
        eraId: form.eraId || '',
        fecha: new Date().toLocaleString(),
      });
      if (id) {
        alert('✅ Entrada registrada');
        setForm(estadoInicial);
        setMostrarForm(false);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  var bitacoraFiltrada = props.bitacora.filter(function (b) {
    return filtro === 'todos' || b.tipo === filtro;
  });

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
            setForm(estadoInicial);
          },
        },
        mostrarForm ? '✖ Cancelar' : '➕ Nueva Entrada'
      )
    ),

    mostrarForm &&
      React.createElement(
        'div',
        {
          style: Object.assign({}, styles.card, {
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            marginBottom: '24px',
          }),
        },
        React.createElement(
          'h3',
          { style: Object.assign({}, styles.cardTitle, { color: '#b45309' }) },
          '➕ Nueva Entrada de Bitácora'
        ),
        React.createElement(
          'form',
          { onSubmit: handleSubmit },
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
                tipos.map(function (t) {
                  return React.createElement('option', { key: t, value: t }, t);
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { style: styles.label },
                'Responsable *'
              ),
              React.createElement('input', {
                type: 'text',
                value: form.responsable,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { responsable: e.target.value })
                  );
                },
                style: styles.input,
                required: true,
                placeholder: 'Nombre del responsable',
              })
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'Móvil'),
              React.createElement(
                'select',
                {
                  value: form.vehiculoId,
                  onChange: function (e) {
                    setForm(
                      Object.assign({}, form, { vehiculoId: e.target.value })
                    );
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: '' }, 'Seleccionar...'),
                props.vehiculos.map(function (v) {
                  return React.createElement(
                    'option',
                    { key: v.id, value: v.nombre },
                    v.nombre + ' - ' + v.tipo
                  );
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement('label', { style: styles.label }, 'ERA'),
              React.createElement(
                'select',
                {
                  value: form.eraId,
                  onChange: function (e) {
                    setForm(Object.assign({}, form, { eraId: e.target.value }));
                  },
                  style: styles.input,
                },
                React.createElement('option', { value: '' }, 'Seleccionar...'),
                props.eras.map(function (era) {
                  return React.createElement(
                    'option',
                    { key: era.id, value: era.marca + ' ' + era.modelo },
                    era.marca + ' ' + era.modelo + ' [' + era.serial + ']'
                  );
                })
              )
            ),
            React.createElement(
              'div',
              { style: { gridColumn: '1 / -1' } },
              React.createElement(
                'label',
                { style: styles.label },
                'Descripción *'
              ),
              React.createElement('textarea', {
                value: form.descripcion,
                onChange: function (e) {
                  setForm(
                    Object.assign({}, form, { descripcion: e.target.value })
                  );
                },
                style: {
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                },
                required: true,
                placeholder: 'Descripción detallada...',
              })
            )
          ),
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: guardando,
              style: {
                width: '100%',
                background: guardando ? '#9ca3af' : '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: guardando ? 'not-allowed' : 'pointer',
              },
            },
            guardando ? '⏳ Guardando...' : '💾 Guardar Entrada'
          )
        )
      ),

    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        },
      },
      React.createElement(
        'button',
        {
          style: filtro === 'todos' ? styles.navBtnActive : styles.navBtn,
          onClick: function () {
            setFiltro('todos');
          },
        },
        'Todos (' + props.bitacora.length + ')'
      ),
      tipos.map(function (t) {
        var count = props.bitacora.filter(function (b) {
          return b.tipo === t;
        }).length;
        if (count === 0) return null;
        return React.createElement(
          'button',
          {
            key: t,
            style: Object.assign(
              {},
              filtro === t ? styles.navBtnActive : styles.navBtn,
              filtro === t ? { background: tipoColores[t] } : {}
            ),
            onClick: function () {
              setFiltro(t);
            },
          },
          t + ' (' + count + ')'
        );
      })
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
            'No hay entradas en la bitácora'
          )
        )
      : React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '16px',
            },
          },
          bitacoraFiltrada.map(function (b) {
            var color = tipoColores[b.tipo] || '#6b7280';
            return React.createElement(
              'div',
              {
                key: b.id,
                style: Object.assign({}, styles.card, {
                  borderLeft: '4px solid ' + color,
                  padding: '20px',
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
                    marginBottom: '12px',
                  },
                },
                React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: color,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                      },
                    },
                    b.tipo
                  ),
                  React.createElement(
                    'p',
                    {
                      style: {
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '6px',
                      },
                    },
                    '📅 ' + (b.fecha || '-')
                  )
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flexShrink: 0,
                    },
                    onClick: function () {
                      if (window.confirm('¿Eliminar esta entrada?')) {
                        props.onEliminar(b.id);
                      }
                    },
                  },
                  '🗑️'
                )
              ),
              React.createElement(
                'p',
                {
                  style: {
                    color: '#374151',
                    fontSize: '14px',
                    marginBottom: '12px',
                    lineHeight: '1.6',
                  },
                },
                b.descripcion
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                b.responsable &&
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: '#e5e7eb',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#374151',
                      },
                    },
                    '👤 ' + b.responsable
                  ),
                b.vehiculoId &&
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: '#dbeafe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#1e40af',
                      },
                    },
                    '🚛 ' + b.vehiculoId
                  ),
                b.eraId &&
                  React.createElement(
                    'span',
                    {
                      style: {
                        background: '#ede9fe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#7c3aed',
                      },
                    },
                    '🎽 ' + b.eraId
                  )
              )
            );
          })
        )
  );
}

// ============================================
// ESTILOS GLOBALES
// ============================================
var styles = {
  container: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  logo: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  btnLogout: {
    padding: '9px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  nav: {
    display: 'flex',
    gap: '6px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  navBtn: {
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    background: 'white',
    color: '#374151',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  navBtnActive: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    background: '#2563eb',
    color: 'white',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  pageTitle: {
    fontSize: '26px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#111827',
    margin: '0 0 24px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpi: {
    padding: '20px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center',
    cursor: 'default',
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: 'bold',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white',
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
    whiteSpace: 'nowrap',
  },
  badgeOk: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  badgeWarn: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  alertItem: {
    background: '#fef2f2',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '8px',
    borderLeft: '4px solid #ef4444',
  },
};
export default App;

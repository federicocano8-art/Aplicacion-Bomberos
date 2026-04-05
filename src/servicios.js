import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// ============================================
// USUARIOS
// ============================================

// Obtener todos los usuarios
export const obtenerUsuarios = async () => {
  const snapshot = await getDocs(collection(db, 'usuarios'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Obtener usuario por email
export const obtenerUsuarioPorEmail = async (email) => {
  const q = query(collection(db, 'usuarios'), where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

// Crear nuevo usuario
export const crearUsuario = async (usuario) => {
  // Verificar si el email ya existe
  const existente = await obtenerUsuarioPorEmail(usuario.email);
  if (existente) {
    throw new Error('El email ya está registrado');
  }

  const docRef = await addDoc(collection(db, 'usuarios'), {
    ...usuario,
    creadoEn: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
  });
  return docRef.id;
};

// Actualizar último acceso
export const actualizarUltimoAcceso = async (usuarioId) => {
  const ref = doc(db, 'usuarios', usuarioId);
  await updateDoc(ref, {
    ultimoAcceso: new Date().toISOString(),
  });
};

// ============================================
// VEHÍCULOS
// ============================================

export const subscribeVehiculos = (callback) => {
  // Implementar con onSnapshot si quieres tiempo real
  return { unsubscribe: () => {} };
};

export const actualizarVehiculo = async (id, datos) => {
  const ref = doc(db, 'vehiculos', id);
  await updateDoc(ref, datos);
};

export const crearVehiculo = async (datos) => {
  await addDoc(collection(db, 'vehiculos'), datos);
};

// ============================================
// ERAs
// ============================================

export const subscribeERAs = (callback) => {
  return { unsubscribe: () => {} };
};

// ============================================
// CHECKLISTS
// ============================================

export const subscribeChecklists = (callback) => {
  return { unsubscribe: () => {} };
};

export const completarChecklist = async (id, datos) => {
  const ref = doc(db, 'checklists', id);
  await updateDoc(ref, datos);
};

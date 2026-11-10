import { Rol } from '../core/auth.service';

// Roles del sistema y cómo se muestran en pantalla
export const ROLES: { valor: Rol; texto: string }[] = [
  { valor: 'Admin', texto: 'Administrador' },
  { valor: 'Operador', texto: 'Operador' },
];

export const etiquetaRol = (rol: Rol): string => ROLES.find((r) => r.valor === rol)?.texto ?? rol;

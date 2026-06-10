/**
 * validation.js – Utilidades de validación usadas en Login y SignUp.
 */

/**
 * Comprueba si una cadena tiene formato de email válido.
 * @param {string} email
 * @returns {boolean}
 */
export function validarEmail(email) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

/**
 * Comprueba que ningún valor del array esté vacío o sea null.
 * @param {Array<string|number>} campos
 * @returns {boolean} true si todos tienen valor.
 */
export function validarCampos(campos) {
  for (let i = 0; i < campos.length; i++) {
    if (campos[i] === '' || campos[i] == null) return false;
  }
  return true;
}

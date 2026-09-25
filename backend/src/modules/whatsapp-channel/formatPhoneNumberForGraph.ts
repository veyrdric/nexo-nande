/**
 * Bug histórico de la Graph API de WhatsApp para números de Formosa (370):
 * el wa_id que manda Meta en el webhook trae el "9" móvil (549370...), pero
 * para ENVIAR hay que reemplazarlo por el prefijo local "15" (54370154...).
 * Confirmado con el ejemplo real que genera el panel de Meta para este número
 * (docs/10-analisis-documentacion-base.md E2, marcado "PENDIENTE DE VALIDAR").
 */
export function formatPhoneNumberForGraph(phone: string): string {
  if (phone.startsWith('5493704')) {
    return phone.replace('5493704', '54370154');
  }
  return phone;
}

/* ============================================
   CASA DE BIA — Configurações globais
   ============================================ */
window.CASA_CONFIG = {
  whatsapp: {
    number: '5571999652027',
    defaultMessage: 'Olá! Tenho interesse em fazer um evento na Casa de Bia.'
  },
  brand: {
    name: 'Casa de Bia',
    tagline: 'Espaço de Eventos',
    address: 'Salvador, BA — CEP 40390-455'
  }
};

window.waLink = function(message) {
  const cfg = window.CASA_CONFIG.whatsapp;
  const text = encodeURIComponent(message || cfg.defaultMessage);
  return `https://wa.me/${cfg.number}?text=${text}`;
};

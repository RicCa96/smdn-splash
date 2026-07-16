// ===== Configurazione del sito (modificabile senza toccare il resto del codice) =====
const SITE_CONFIG = {
  instagramUrl: "https://instagram.com/sagra_vezzano",
  // Numero WhatsApp per invio foto/video (formato internazionale senza +)
  whatsappNumber: "393465210969",
  whatsappMessage: "Ciao! Vi invio foto/video per Splash SMDN. Squadra: ",
  // Link al Google Form per le iscrizioni
  iscrizioniUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfaJX5qYAAmlu2M6SNxbvlfSX-_oIrh-2yljF7O_AuG6yo3Fg/viewform",
  // Giorni disponibili nel pannello admin
  giorni: ["GIO 30/07", "VEN 31/07", "SAB 01/08", "DOM 02/08"],

  // ===== Cloudinary (upload foto/video, gratuito) =====
  // 1. Crea un account su https://cloudinary.com (piano Free)
  // 2. Dashboard -> copia il "Cloud name" qui sotto
  // 3. Settings -> Upload -> Upload presets -> Add upload preset:
  //    - Signing mode: UNSIGNED
  //    - (consigliato) Folder: smdn-splash
  //    Copia il nome del preset qui sotto
  // Finché resta "REPLACE_ME", il box di upload non viene mostrato (resta il link WhatsApp).
  cloudinaryCloudName: "qrxg0rij",
  cloudinaryUploadPreset: "smdn-splash",
};

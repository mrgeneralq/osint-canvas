export const NODE_TYPE_CONFIG = {
  // ── Identity ────────────────────────────────────────────────────────────────
  target:        { label: 'Target',           icon: '🎯', color: '#3f1010', border: '#6a1a1a', group: 'Identity' },
  person:        { label: 'Person',           icon: '👤', color: '#1e3a5f', border: '#2a5480', group: 'Identity' },
  alias:         { label: 'Alias / Handle',   icon: '🏷️', color: '#2d1f4f', border: '#4a3570', group: 'Identity' },
  username:      { label: 'Username',         icon: '🪪', color: '#1f2a40', border: '#2e4060', group: 'Identity' },
  government_id: { label: 'Government ID',    icon: '🪪', color: '#2a200a', border: '#4a3810', group: 'Identity' },

  // ── Contact ─────────────────────────────────────────────────────────────────
  phone:         { label: 'Phone',            icon: '📱', color: '#1a3828', border: '#2a5840', group: 'Contact' },
  email:         { label: 'Email',            icon: '📧', color: '#3a2810', border: '#5a4020', group: 'Contact' },
  address:       { label: 'Address',          icon: '📍', color: '#2a1a1a', border: '#4a2828', group: 'Contact' },
  sim_card:      { label: 'SIM / IMSI',       icon: '📶', color: '#0f2a20', border: '#1a4830', group: 'Contact' },

  // ── Online ───────────────────────────────────────────────────────────────────
  social:        { label: 'Social Profile',   icon: '🌐', color: '#1a2a3f', border: '#2a4a60', group: 'Online' },
  chat_account:  { label: 'Chat Account',     icon: '💬', color: '#1a2838', border: '#284858', group: 'Online' },
  forum_account: { label: 'Forum Account',    icon: '📋', color: '#241a38', border: '#3a2858', group: 'Online' },
  url:           { label: 'URL / Website',    icon: '🔗', color: '#1f2a1a', border: '#304a28', group: 'Online' },
  domain:        { label: 'Domain',           icon: '🌍', color: '#1a2a20', border: '#2a4838', group: 'Online' },
  ip:            { label: 'IP Address',       icon: '🖥️', color: '#2a2a1a', border: '#4a4a28', group: 'Online' },
  darkweb:       { label: 'Dark Web / Onion', icon: '🕵️', color: '#100a20', border: '#281848', group: 'Online' },
  crypto:        { label: 'Crypto Wallet',    icon: '₿',  color: '#2a1f10', border: '#4a3820', group: 'Online' },

  // ── Technical ────────────────────────────────────────────────────────────────
  certificate:   { label: 'Certificate',      icon: '🔐', color: '#1a2010', border: '#2a3818', group: 'Technical' },
  file_hash:     { label: 'File / Hash',      icon: '#️⃣', color: '#201a28', border: '#382840', group: 'Technical' },
  malware:       { label: 'Malware',          icon: '☠️', color: '#2a0a0a', border: '#501010', group: 'Technical' },
  network_device:{ label: 'Network Device',   icon: '📡', color: '#0a1a2a', border: '#183050', group: 'Technical' },
  imei:          { label: 'IMEI / Device',    icon: '📟', color: '#1a1820', border: '#2a2838', group: 'Technical' },

  // ── Financial ────────────────────────────────────────────────────────────────
  company:       { label: 'Company',          icon: '🏦', color: '#10201a', border: '#1a3828', group: 'Financial' },
  bank_account:  { label: 'Bank Account',     icon: '💳', color: '#0a1a10', border: '#183020', group: 'Financial' },
  transaction:   { label: 'Transaction',      icon: '💸', color: '#1a1a0a', border: '#303018', group: 'Financial' },

  // ── Physical ─────────────────────────────────────────────────────────────────
  location:      { label: 'Location',         icon: '🗺️', color: '#1a2a1a', border: '#2a4a2a', group: 'Physical' },
  coordinates:   { label: 'Coordinates',      icon: '📌', color: '#1a2010', border: '#2a3818', group: 'Physical' },
  facility:      { label: 'Facility',         icon: '🏭', color: '#20181a', border: '#382830', group: 'Physical' },
  vehicle:       { label: 'Vehicle',          icon: '🚗', color: '#201a20', border: '#382838', group: 'Physical' },
  organization:  { label: 'Organization',     icon: '🏢', color: '#1a2820', border: '#284838', group: 'Physical' },

  // ── Evidence ─────────────────────────────────────────────────────────────────
  image:         { label: 'Image',            icon: '🖼️', color: '#2a1a2a', border: '#4a2848', group: 'Evidence' },
  document:      { label: 'Document',         icon: '📄', color: '#1a2a2a', border: '#284848', group: 'Evidence' },
  leaked_data:   { label: 'Leaked Data',      icon: '🗂️', color: '#2a1010', border: '#481818', group: 'Evidence' },
  screenshot:    { label: 'Screenshot',       icon: '🖥️', color: '#201828', border: '#382840', group: 'Evidence' },
  warrant:       { label: 'Warrant / Legal',  icon: '⚖️', color: '#20200a', border: '#383810', group: 'Evidence' },

  // ── Intelligence ─────────────────────────────────────────────────────────────
  note:          { label: 'Note',             icon: '📝', color: '#2a2010', border: '#4a3818', group: 'Intelligence' },
  event:         { label: 'Event / Date',     icon: '📅', color: '#1a1a30', border: '#282848', group: 'Intelligence' },
  source:        { label: 'Source',           icon: '🗣️', color: '#1a2828', border: '#284040', group: 'Intelligence' },
  keyword:       { label: 'Keyword',          icon: '🔑', color: '#281a10', border: '#483018', group: 'Intelligence' },

  // ── Method ───────────────────────────────────────────────────────────────────
  method:        { label: 'Pivot / Method',   icon: '⚡', color: '#1a1f10', border: '#3a4818', group: 'Method' },
}

export const PALETTE_GROUPS = [
  'Identity', 'Contact', 'Online', 'Technical', 'Financial', 'Physical', 'Evidence', 'Intelligence', 'Method',
]

export const CONFIDENCE_LEVELS = {
  unverified: { label: 'Unverified', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  probable:   { label: 'Probable',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  confirmed:  { label: 'Confirmed',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   },
}

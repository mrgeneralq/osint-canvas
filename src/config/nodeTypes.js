export const NODE_TYPE_CONFIG = {
  person:       { label: 'Person',         icon: '👤', color: '#1e3a5f', border: '#2a5480', group: 'Identity' },
  alias:        { label: 'Alias',          icon: '🏷️', color: '#2d1f4f', border: '#4a3570', group: 'Identity' },
  phone:        { label: 'Phone',          icon: '📱', color: '#1a3828', border: '#2a5840', group: 'Contact' },
  email:        { label: 'Email',          icon: '📧', color: '#3a2810', border: '#5a4020', group: 'Contact' },
  address:      { label: 'Address',        icon: '📍', color: '#2a1a1a', border: '#4a2828', group: 'Contact' },
  social:       { label: 'Social Profile', icon: '🌐', color: '#1a2a3f', border: '#2a4a60', group: 'Online' },
  url:          { label: 'URL / Website',  icon: '🔗', color: '#1f2a1a', border: '#304a28', group: 'Online' },
  ip:           { label: 'IP / Domain',    icon: '🖥️', color: '#2a2a1a', border: '#4a4a28', group: 'Online' },
  image:        { label: 'Image',          icon: '🖼️', color: '#2a1a2a', border: '#4a2848', group: 'Evidence' },
  document:     { label: 'Document',       icon: '📄', color: '#1a2a2a', border: '#284848', group: 'Evidence' },
  note:         { label: 'Note',           icon: '📝', color: '#2a2010', border: '#4a3818', group: 'Analysis' },
  event:        { label: 'Event / Date',   icon: '📅', color: '#1a1a30', border: '#282848', group: 'Analysis' },
  organization: { label: 'Organization',   icon: '🏢', color: '#1a2820', border: '#284838', group: 'Analysis' },
  vehicle:      { label: 'Vehicle',        icon: '🚗', color: '#201a20', border: '#382838', group: 'Analysis' },
  location:     { label: 'Location',       icon: '🗺️', color: '#1a2a1a', border: '#2a4a2a', group: 'Analysis' },
  crypto:       { label: 'Crypto Wallet',  icon: '₿',  color: '#2a1f10', border: '#4a3820', group: 'Online' },
  method:       { label: 'Pivot / Method', icon: '⚡', color: '#1a1f10', border: '#3a4818', group: 'Method' },
}

export const PALETTE_GROUPS = ['Identity', 'Contact', 'Online', 'Evidence', 'Analysis', 'Method']

export const CONFIDENCE_LEVELS = {
  unverified: { label: 'Unverified', color: '#6b7280', bg: '#1f2028' },
  probable:   { label: 'Probable',   color: '#f59e0b', bg: '#2a2010' },
  confirmed:  { label: 'Confirmed',  color: '#22c55e', bg: '#0f2a14' },
}

export const EDGE_RELATIONSHIP_TYPES = {
  // General
  default:       { label: 'linked to',         color: '#6b7280', dash: false, group: 'General',       bidirectional: false },
  suspected:     { label: 'suspected link',     color: '#94a3b8', dash: true,  group: 'General',       bidirectional: false },

  // Identity
  alias_of:      { label: 'alias of',           color: '#a78bfa', dash: false, group: 'Identity',      bidirectional: false },
  owns:          { label: 'owns',               color: '#60a5fa', dash: false, group: 'Identity',      bidirectional: false },
  member_of:     { label: 'member of',          color: '#818cf8', dash: false, group: 'Identity',      bidirectional: false },
  impersonates:  { label: 'impersonates',       color: '#f472b6', dash: true,  group: 'Identity',      bidirectional: false },

  // Communication
  communicated:  { label: 'communicated with',  color: '#34d399', dash: false, group: 'Communication', bidirectional: true  },
  contacted:     { label: 'contacted',          color: '#34d399', dash: true,  group: 'Communication', bidirectional: false },

  // Technical
  resolves_to:   { label: 'resolves to',        color: '#fbbf24', dash: false, group: 'Technical',     bidirectional: false },
  hosted_on:     { label: 'hosted on',          color: '#fbbf24', dash: true,  group: 'Technical',     bidirectional: false },
  registered:    { label: 'registered',         color: '#fb923c', dash: false, group: 'Technical',     bidirectional: false },

  // Location
  located_at:    { label: 'located at',         color: '#f472b6', dash: false, group: 'Location',      bidirectional: false },
  visited:       { label: 'visited',            color: '#f472b6', dash: true,  group: 'Location',      bidirectional: false },

  // Evidence
  evidence_of:   { label: 'evidence of',        color: '#f87171', dash: false, group: 'Evidence',      bidirectional: false },
  references:    { label: 'references',         color: '#f87171', dash: true,  group: 'Evidence',      bidirectional: false },
}

// Confidence levels for edges
export const EDGE_CONFIDENCE = {
  unverified: { label: 'Unverified', color: '#4b5563', strokeWidth: 1.2, opacity: 0.45 },
  suspected:  { label: 'Suspected',  color: null,      strokeWidth: 1.5, opacity: 0.65 },
  probable:   { label: 'Probable',   color: null,      strokeWidth: 2.0, opacity: 0.85 },
  confirmed:  { label: 'Confirmed',  color: null,      strokeWidth: 3.0, opacity: 1.0  },
}

// Infer a default relationship type from connected node types
export function inferRelationship(sourceType, targetType) {
  const map = {
    'person→email':          'owns',
    'person→phone':          'owns',
    'person→social':         'owns',
    'person→address':        'located_at',
    'person→ip':             'registered',
    'person→url':            'owns',
    'person→crypto':         'owns',
    'person→vehicle':        'owns',
    'person→organization':   'member_of',
    'person→person':         'communicated',
    'person→alias':          'alias_of',
    'person→location':       'located_at',
    'alias→person':          'alias_of',
    'ip→url':                'hosted_on',
    'url→ip':                'hosted_on',
    'ip→domain':             'resolves_to',
    'image→person':          'evidence_of',
    'image→event':           'evidence_of',
    'document→person':       'evidence_of',
    'document→event':        'evidence_of',
    'document→organization': 'evidence_of',
    'organization→person':   'member_of',
    'organization→address':  'located_at',
    'organization→location': 'located_at',
    'email→person':          'owns',
    'phone→person':          'owns',
    'social→person':         'owns',
  }
  return map[`${sourceType}→${targetType}`] ?? 'default'
}

export const EDGE_REL_GROUPS = ['General', 'Identity', 'Communication', 'Technical', 'Location', 'Evidence']

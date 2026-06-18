export const EDGE_RELATIONSHIP_TYPES = {
  default:        { label: 'Link',           color: '#5a6290', dash: false },
  leads_to:       { label: 'Leads to',       color: '#7c8cf8', dash: false },
  same_as:        { label: 'Same person',     color: '#a855f7', dash: false },
  confirmed_via:  { label: 'Confirmed via',   color: '#22c55e', dash: false },
  contradicts:    { label: 'Contradicts',     color: '#ef4444', dash: true  },
  associated:     { label: 'Associated with', color: '#94a3b8', dash: true  },
  owns:           { label: 'Owns',            color: '#f59e0b', dash: false },
  used_by:        { label: 'Used by',         color: '#fb923c', dash: false },
  located_at:     { label: 'Located at',      color: '#34d399', dash: false },
}

// URL templates — {value} is replaced with the node's value
export const LOOKUP_URLS = {
  phone: [
    { label: 'TrueCaller',      url: 'https://www.truecaller.com/search/nl/{value}' },
    { label: 'PhoneInfoga',     url: 'https://github.com/sundowndev/phoneinfoga' },
    { label: 'Google Search',   url: 'https://www.google.com/search?q="{value}"' },
  ],
  email: [
    { label: 'HaveIBeenPwned',  url: 'https://haveibeenpwned.com/account/{value}' },
    { label: 'Hunter.io',       url: 'https://hunter.io/email-verifier/{value}' },
    { label: 'Epieos',          url: 'https://epieos.com/?q={value}&t=email' },
    { label: 'Google Search',   url: 'https://www.google.com/search?q="{value}"' },
  ],
  ip: [
    { label: 'Shodan',          url: 'https://www.shodan.io/host/{value}' },
    { label: 'AbuseIPDB',       url: 'https://www.abuseipdb.com/check/{value}' },
    { label: 'VirusTotal',      url: 'https://www.virustotal.com/gui/ip-address/{value}' },
    { label: 'IPInfo',          url: 'https://ipinfo.io/{value}' },
    { label: 'WHOIS',           url: 'https://who.is/whois-ip/ip-address/{value}' },
  ],
  url: [
    { label: 'Wayback Machine', url: 'https://web.archive.org/web/*/{value}' },
    { label: 'VirusTotal',      url: 'https://www.virustotal.com/gui/url/{value}' },
    { label: 'URLScan',         url: 'https://urlscan.io/search/#page.domain:{value}' },
    { label: 'WHOIS',           url: 'https://who.is/whois/{value}' },
  ],
  alias: [
    { label: 'Namechk',         url: 'https://namechk.com/{value}' },
    { label: 'WhatsMyName',     url: 'https://whatsmyname.app/?q={value}' },
    { label: 'Google Search',   url: 'https://www.google.com/search?q="{value}"' },
  ],
  person: [
    { label: 'Google Search',   url: 'https://www.google.com/search?q="{value}"' },
    { label: 'LinkedIn',        url: 'https://www.linkedin.com/search/results/people/?keywords={value}' },
    { label: 'Pipl',            url: 'https://pipl.com/search/?q={value}' },
  ],
  social: [
    { label: 'Google Search',   url: 'https://www.google.com/search?q="{value}"' },
    { label: 'Wayback Machine', url: 'https://web.archive.org/web/*/{value}' },
  ],
  crypto: [
    { label: 'Blockchain.com',  url: 'https://www.blockchain.com/explorer/search?search={value}' },
    { label: 'Etherscan',       url: 'https://etherscan.io/search?q={value}' },
    { label: 'Breadcrumbs',     url: 'https://www.breadcrumbs.app/reports/{value}' },
  ],
}

# Coverage

This document describes the data coverage of the French Data Protection MCP.

## Authority

**CNIL — Commission nationale de l'informatique et des libertés**
Official French data protection supervisory authority.
Website: https://www.cnil.fr/

## Data Sources

### CNIL Decisions

- **URL:** https://www.cnil.fr/fr/deliberations
- **License:** Etalab Open License / Open Government Licence France
- **Types covered:** sanctions, mises en demeure, deliberations, avis
- **Language:** French
- **Update frequency:** Periodic

### CNIL Guidance Documents

- **URL:** https://www.cnil.fr/fr/les-guides-de-la-cnil
- **License:** Etalab Open License / Open Government Licence France
- **Types covered:** guides pratiques, recommandations, référentiels, FAQs
- **Language:** French
- **Update frequency:** Periodic

## Topics Covered

| Topic ID | French | English |
|----------|--------|---------|
| `consent` | Consentement | Consent |
| `cookies` | Cookies | Cookies |
| `transfers` | Transferts de données | Data transfers |
| `dpia` | Analyse d'impact (AIPD) | DPIA |
| `breach_notification` | Notification de violation | Breach notification |
| `privacy_by_design` | Vie privée dès la conception | Privacy by design |
| `employee_monitoring` | Surveillance des employés | Employee monitoring |
| `health_data` | Données de santé | Health data |
| `children` | Données des mineurs | Children's data |

## Tools

| Tool | Coverage |
|------|----------|
| `fr_dp_search_decisions` | Full-text search across all CNIL decisions |
| `fr_dp_get_decision` | Retrieve a specific decision by reference |
| `fr_dp_search_guidelines` | Full-text search across all CNIL guidance documents |
| `fr_dp_get_guideline` | Retrieve a specific guidance document by ID |
| `fr_dp_list_topics` | List all available topic IDs |
| `fr_dp_about` | Server metadata and tool list |
| `fr_dp_list_sources` | Data source provenance and licensing |
| `fr_dp_check_data_freshness` | Database statistics and data age |

## Machine-Readable Coverage

See [`data/coverage.json`](data/coverage.json) for a machine-readable version of this information.

## Limitations

- Coverage may not include the most recent CNIL decisions — updates are periodic.
- Full text of some decisions may be abbreviated or summarised.
- This MCP is a research tool; verify all references against official CNIL publications.

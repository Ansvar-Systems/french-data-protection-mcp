# Tools Reference

This document describes all MCP tools exposed by the French Data Protection MCP.

Tool prefix: `fr_dp_`

---

## fr_dp_search_decisions

Full-text search across CNIL decisions (deliberations, sanctions, mises en demeure).

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., `consentement cookies`, `Google`, `transfert données`) |
| `type` | string | No | Filter by decision type: `sanction`, `mise_en_demeure`, `deliberation`, `avis` |
| `topic` | string | No | Filter by topic ID (e.g., `consent`, `cookies`, `transfers`) |
| `limit` | number | No | Maximum results to return (default: 20, max: 100) |

**Output:** Array of matching decisions with reference, title, date, type, entity name, fine amount, summary, and GDPR articles cited. Includes `_meta` block.

---

## fr_dp_get_decision

Retrieve a specific CNIL decision by its reference number.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reference` | string | Yes | CNIL decision reference (e.g., `SAN-2022-009`, `MED-2021-015`) |

**Output:** Full decision record including `_citation` metadata (for the deterministic citation pipeline) and `_meta` block.

---

## fr_dp_search_guidelines

Search CNIL guidance documents: guides pratiques, recommandations, référentiels, and FAQs.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., `DPIA`, `cookies consent`, `violation données`) |
| `type` | string | No | Filter by type: `guide`, `recommandation`, `referentiel`, `FAQ` |
| `topic` | string | No | Filter by topic ID (e.g., `dpia`, `cookies`, `breach_notification`) |
| `limit` | number | No | Maximum results to return (default: 20, max: 100) |

**Output:** Array of matching guidance documents with reference, title, date, type, summary, and topics. Includes `_meta` block.

---

## fr_dp_get_guideline

Retrieve a specific CNIL guidance document by its database ID.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Guideline database ID (from `fr_dp_search_guidelines` results) |

**Output:** Full guideline record including `_citation` metadata and `_meta` block.

---

## fr_dp_list_topics

List all covered data protection topics with French and English names.

**Input:** None.

**Output:** Array of topic objects with `id`, `name_fr`, `name_en`, and `description`. Use topic IDs to filter decisions and guidelines. Includes `_meta` block.

---

## fr_dp_about

Return metadata about this MCP server.

**Input:** None.

**Output:** Server name, version, description, data source, coverage summary, and full tool list. Includes `_meta` block.

---

## fr_dp_list_sources

List all data sources used by this MCP server with provenance and licensing information.

**Input:** None.

**Output:** Array of source objects with `id`, `name`, `authority`, `url`, `license`, `coverage`, `update_frequency`, and `language`. Includes `_meta` block.

---

## fr_dp_check_data_freshness

Check when the database was last updated and report coverage statistics.

**Input:** None.

**Output:** Record counts for decisions, guidelines, and topics; newest entry dates; database path; and overall status (`ok` or `empty`). Includes `_meta` block.

---

## Common Response Fields

### `_meta` block

All tool responses include a `_meta` block:

```json
{
  "_meta": {
    "disclaimer": "This is a research tool, not regulatory or legal advice...",
    "data_age": "Periodic updates; may lag official CNIL publications...",
    "copyright": "Data sourced from CNIL...",
    "source_url": "https://www.cnil.fr/"
  }
}
```

### `_citation` block

`fr_dp_get_decision` and `fr_dp_get_guideline` include a `_citation` block for the deterministic citation pipeline:

```json
{
  "_citation": {
    "canonical_ref": "SAN-2022-009",
    "display_text": "CNIL SAN-2022-009",
    "source_url": "https://www.cnil.fr/...",
    "lookup": {
      "tool": "fr_dp_get_decision",
      "args": { "reference": "SAN-2022-009" }
    }
  }
}
```

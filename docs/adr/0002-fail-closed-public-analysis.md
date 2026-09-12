# Public comparisons fail closed when evidence is inadequate

Garuda Lens suppresses comparative metrics and recommendations when either time window lacks adequate combined evidence from cloud cover, valid AOI coverage, required bands, or scene overlap. It still exposes scene/search metadata, the exact insufficiency reason, and remediation guidance so public users can understand and correct the problem.

**Status**: accepted

**Consequences**: The product may return fewer conclusions than a permissive analysis tool, but it avoids presenting incomplete comparisons as authoritative. Partial metadata remains available for diagnosis and provenance.

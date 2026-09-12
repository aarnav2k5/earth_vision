# Garuda Lens

Garuda Lens is a public-facing satellite land-use intelligence context for comparing Sentinel-2 signals across two user-selected time windows. It supports environmental screening and prioritization while communicating uncertainty and the need for field or professional validation.

## Users and decisions

**Public user**:
A general-public operator who may not have remote-sensing expertise and therefore needs plain-language explanations, visible limitations, and protective guardrails.

**Screening**:
An initial, non-determinative review of satellite-derived signals to identify areas that may deserve attention.
_Avoid_: certification, assessment, compliance determination

**Prioritization**:
Ordering or highlighting sites for follow-up investigation based on computed signals and their confidence limitations.

**Recommendation**:
A plain-language screening suggestion such as possible agricultural stress, a prompt to investigate a site, or a potential development-screening candidate; it is never a declaration that a site is suitable, legal, compliant, safe, or causally explained.

## Geospatial analysis

**AOI (area of interest)**:
A user-supplied valid Polygon or MultiPolygon that defines the geographic extent of one analysis.

**Analysis**:
A comparison of an AOI across a before window and an after window using selected satellite scenes and derived signals.

**Analysis proposal**:
A chat-generated interpretation of the user's requested place, time windows, signals, and parameters that must be reviewed and confirmed before analysis runs.

**Time window**:
A user-selected date interval from which a usable satellite scene may be selected.

**Signal**:
A satellite-derived measurement or heuristic comparison, including vegetation, water, brightness, and built-surface indicators.

**Built-surface change signal**:
A heuristic indication of change in bright or building-like surface response; it is not proof of buildings, urbanization, construction, or land-use cause.

**Urban expansion**:
The product's user-facing label for a built-surface change signal, retained because it is established by the visual reference screens; it remains a heuristic and does not prove urbanization, construction, or cause.
_Avoid_: building detection

**Confidence limitation**:
The scene, pixel-validity, cloud, seasonal, spatial, or heuristic constraint that limits how strongly a signal should be interpreted.

**Seasonal comparability warning**:
A prominent warning that arbitrary before and after windows may reflect seasonal, illumination, or acquisition differences in addition to land-use change.

**Usable scene**:
A scene that satisfies the configured search and coverage requirements sufficiently for the requested comparison.

## Outputs and provenance

**Analysis manifest**:
A portable record of the AOI, date windows, selected scenes, acquisition and cloud metadata, processing version, user-selected or default thresholds, derived metrics, and warnings needed to understand or reproduce an analysis.

**Advisory insight**:
An optional metrics-grounded natural-language summary that may explain deterministic signals and limitations but may not independently interpret imagery, introduce recommendations, assert causes, or provide professional advice.

**Supported signal**:
Any meaningful user-facing output the analysis computes, including vegetation, water, brightness, built-surface, raw metrics, masks, scene metadata, and warnings.

**Insufficient evidence**:
A condition in which one or both time windows lack enough usable data for a valid comparison; the system may show search and scene metadata but suppress comparative metrics and recommendations.

**Evidence quality**:
The combined adequacy of cloud cover, valid AOI pixel coverage, required-band availability, and scene overlap for producing a comparison.

**Threshold override**:
A user-selected replacement for a platform default signal threshold, bounded by the product and recorded with its impact warning in the analysis manifest.

**Sensitivity warning**:
A warning shown when threshold choices make a signal unusually broad or narrow; recommendations remain withheld until the user acknowledges the interpretation risk.

**Signal mask**:
A visual layer showing the pixels associated with one selected supported signal or with invalid evidence, presented with a plain-language legend.

**Metric summary**:
The default quantitative view showing percentages, hectares, pixel counts, means, deltas, thresholds, and valid-pixel coverage; formulas and distributions are expandable technical detail.

**Export acknowledgment**:
A short confirmation required before generating a PDF, stating that the result is a screening aid and not professional, legal, environmental, agricultural, or development approval advice.

**Technical appendix**:
The optional detailed section of a public-friendly PDF containing formulas, thresholds, scene provenance, processing metadata, masks, and other interpretive limitations.

**Client-side persistence**:
Saving workspace state in the user's browser without retaining AOIs or analysis results on the server by default.

**Reference screen**:
A supplied product screen that takes precedence over conflicting prose for visible terminology and behavior.

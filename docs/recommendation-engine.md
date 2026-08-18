# Recommendation engine

Pipeline:

1. Load taste profile and interaction history
2. Candidate generation (~500): similar-to-liked, genre, popular, hidden gems, exploration, optional similar-to
3. Filter disliked / not-interested
4. Score with versioned weights
5. Optional AI rerank of the top 30
6. MMR diversity to ~10
7. Persist `RecommendationGeneration` + component scores
8. Feedback updates `TasteService`

Default weights (`v1.0`):

- 30% content similarity
- 25% taste match
- 15% historical feedback
- 10% creator
- 10% quality
- 10% exploration

Modes remap those weights. `SURPRISE_ME` raises exploration. `HIDDEN_GEMS` / `DEEP_CUTS` down-weight popularity.

Taste update:

```
new = clamp(old * 0.98 + signal * learningRate, -1, 1)
```

A single interaction cannot move a dimension by more than 0.30.

UI match percentages are these score components. They are not decorated after the fact.

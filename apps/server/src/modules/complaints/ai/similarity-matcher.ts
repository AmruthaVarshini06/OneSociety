export interface ClusterSummary {
  _id: string;
  clusterNumber: string;
  title: string;
  category: string;
  block?: string;
  specificArea: string;
  status: string;
  reportCount: number;
  priorityLevel: string;
}

export interface SimilarityMatch {
  cluster: ClusterSummary;
  similarityScore: number;
  matchReason: string;
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return new Set(words);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export function findSimilarClusters(
  category: string,
  block: string | undefined,
  specificArea: string,
  description: string,
  existingClusters: ClusterSummary[]
): SimilarityMatch[] {
  const inputTokens = tokenize(`${category} ${block || ''} ${specificArea} ${description}`);
  const matches: SimilarityMatch[] = [];

  for (const cluster of existingClusters) {
    if (cluster.status === 'SOLVED' || cluster.status === 'CLOSED' || cluster.status === 'OUT_OF_SCOPE') {
      continue;
    }

    let matchScore = 0;
    const reasons: string[] = [];

    if (cluster.category.toLowerCase() === category.toLowerCase()) {
      matchScore += 0.4;
      reasons.push('Same category');
    }

    if (block && cluster.block && cluster.block.toLowerCase() === block.toLowerCase()) {
      matchScore += 0.25;
      reasons.push(`Same block (${block})`);
    }

    const clusterTokens = tokenize(`${cluster.category} ${cluster.block || ''} ${cluster.specificArea} ${cluster.title}`);
    const textSim = jaccardSimilarity(inputTokens, clusterTokens);
    matchScore += textSim * 0.45;

    if (textSim > 0.2) {
      reasons.push('Matching keywords in description/location');
    }

    if (matchScore >= 0.5) {
      matches.push({
        cluster,
        similarityScore: Math.min(1, Math.round(matchScore * 100) / 100),
        matchReason: reasons.join(', '),
      });
    }
  }

  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}

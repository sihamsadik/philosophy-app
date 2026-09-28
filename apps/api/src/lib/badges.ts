import { and, eq, isNull, count } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { profiles, entities, eventHosts, spaceMembers } from "../db/schema/index.js";

export interface PhilosophicalBadge {
  id: string;
  code: string;
  title: string;
  icon: string;
  description: string;
  category: "debate" | "scholar" | "events" | "community" | "reputation";
  progressPercentage: number;
}

export interface UserStats {
  reputation: number;
  argumentsCount: number;
  symposiumsHosted: number;
  spacesJoined: number;
}

export function computeBadgesFromStats(stats: UserStats): PhilosophicalBadge[] {
  const { reputation, argumentsCount, symposiumsHosted, spacesJoined } = stats;

  const masterDebaterProgress = Math.min(100, Math.round((argumentsCount / 5) * 100));
  const stoicScholarProgress = Math.max(
    argumentsCount >= 1 ? 50 : 0,
    Math.min(100, Math.round((reputation / 200) * 100))
  );
  const symposiumHostProgress = Math.min(100, Math.round((symposiumsHosted / 3) * 100));
  const circleStewardProgress = Math.min(100, Math.round((spacesJoined / 2) * 100));
  const catalystProgress = Math.min(100, Math.round((reputation / 1000) * 100));

  return [
    {
      id: "badge-master-debater",
      code: "master_debater",
      title: "⚔️ Master Debater",
      icon: "⚔️",
      description: "Published 5+ high-engagement formal debate arguments with high upvote ratios.",
      category: "debate",
      progressPercentage: masterDebaterProgress,
    },
    {
      id: "badge-stoic-scholar",
      code: "stoic_scholar",
      title: "📜 Stoic Scholar",
      icon: "📜",
      description: "Achieved >90% worldview compatibility in Stoic virtue ethics & dichotomy of control.",
      category: "scholar",
      progressPercentage: stoicScholarProgress,
    },
    {
      id: "badge-symposium-host",
      code: "symposium-host",
      title: "📅 Symposium Host",
      icon: "📅",
      description: "Scheduled and hosted 3+ virtual symposiums, live formal duels, or reading groups.",
      category: "events",
      progressPercentage: symposiumHostProgress,
    },
    {
      id: "badge-circle-steward",
      code: "circle_steward",
      title: "🏛️ Circle Steward",
      icon: "🏛️",
      description: "Active member and contributor in 2+ philosophical school circles.",
      category: "community",
      progressPercentage: circleStewardProgress,
    },
    {
      id: "badge-philosophical-catalyst",
      code: "philosophical_catalyst",
      title: "⚡ Philosophical Catalyst",
      icon: "⚡",
      description: "Earned 1,000+ total community reputation points through insightful contributions.",
      category: "reputation",
      progressPercentage: catalystProgress,
    },
  ];
}

export async function getUserBadges(projectId: string, userId: string): Promise<PhilosophicalBadge[]> {
  const [profile] = await getDb()
    .select({ reputation: profiles.reputation })
    .from(profiles)
    .where(and(eq(profiles.projectId, projectId), eq(profiles.id, userId)))
    .limit(1);

  if (!profile) return computeBadgesFromStats({ reputation: 0, argumentsCount: 0, symposiumsHosted: 0, spacesJoined: 0 });

  const [{ argCount } = { argCount: 0 }] = await getDb()
    .select({ argCount: count() })
    .from(entities)
    .where(and(eq(entities.projectId, projectId), eq(entities.userId, userId), isNull(entities.deletedAt)));

  const [{ hostCount } = { hostCount: 0 }] = await getDb()
    .select({ hostCount: count() })
    .from(eventHosts)
    .where(and(eq(eventHosts.projectId, projectId), eq(eventHosts.userId, userId)));

  const [{ spaceCount } = { spaceCount: 0 }] = await getDb()
    .select({ spaceCount: count() })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.projectId, projectId), eq(spaceMembers.userId, userId), eq(spaceMembers.status, "active")));

  return computeBadgesFromStats({
    reputation: profile.reputation ?? 0,
    argumentsCount: Number(argCount),
    symposiumsHosted: Number(hostCount),
    spacesJoined: Number(spaceCount),
  });
}

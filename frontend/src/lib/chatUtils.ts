import type { Chat } from '@/lib/chatStore';
import type { Locale } from '@/lib/i18n';
import { getCountryNameLocalized } from '@/lib/countries';
import {
  Plane,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  TrendingUp,
  Home,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const OBJECTIVE_ICON_MAP: Record<string, LucideIcon> = {
  'setup.objective.temporary_visit': Plane,
  'setup.objective.education': GraduationCap,
  'setup.objective.work': Briefcase,
  'setup.objective.family_reunion': Users,
  'setup.objective.seek_protection': Shield,
  'setup.objective.investments': TrendingUp,
  'setup.objective.permanent_residence': Home,
  'setup.objective.other': MoreHorizontal,
};

export function getObjectiveIcon(objective: string): LucideIcon {
  const first = objective.split(', ')[0];
  return OBJECTIVE_ICON_MAP[first] ?? MoreHorizontal;
}

export function chatLabel(chat: Chat, t: (key: string) => string): string {
  const origin = chat.systemVars.origin_country;
  const dest = chat.systemVars.destination_country;
  if (origin && dest) {
    const originName = getCountryNameLocalized(origin, t);
    const destName = getCountryNameLocalized(dest, t);
    return `${originName} → ${destName}`;
  }
  if (dest) return getCountryNameLocalized(dest, t);
  if (origin) return getCountryNameLocalized(origin, t);
  return chat.id.slice(0, 8);
}

export const SECONDS_IN = { minute: 60, hour: 3600, day: 86400, week: 604800 };

export function timeAgo(timestamp: number, locale: Locale): string {
  const diff = Math.round((Date.now() - timestamp) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' });

  if (diff < SECONDS_IN.minute) return rtf.format(0, 'second');
  if (diff < SECONDS_IN.hour) return rtf.format(-Math.round(diff / SECONDS_IN.minute), 'minute');
  if (diff < SECONDS_IN.day) return rtf.format(-Math.round(diff / SECONDS_IN.hour), 'hour');
  if (diff < SECONDS_IN.week) return rtf.format(-Math.round(diff / SECONDS_IN.day), 'day');

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(timestamp);
}

export function absoluteDate(timestamp: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

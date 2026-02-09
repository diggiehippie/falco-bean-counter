export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10) return 'zojuist';
  if (seconds < 60) return `${seconds} seconden geleden`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'} geleden`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'uur' : 'uren'} geleden`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'gisteren';
  if (days < 30) return `${days} dagen geleden`;

  return date.toLocaleDateString('nl-NL');
}

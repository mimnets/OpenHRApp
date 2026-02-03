
export const formatDate = (date: string | Date | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', options);
};

export const formatTime = (date: string | Date | undefined): string => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

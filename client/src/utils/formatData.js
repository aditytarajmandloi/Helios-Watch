/**
 * Formats raw metric data from the API into chart-ready grouped arrays.
 * Uses full ISO timestamp as key to avoid merging data from different days.
 */
export const formatChartData = (rawData, hours = 6) => {
  if (!rawData || rawData.length === 0) return [];

  // Determine time label format based on range
  const formatTimeLabel = (date) => {
    if (hours <= 24) {
      // Short ranges: just show time "14:30"
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours <= 168) {
      // Up to 7 days: show "Apr 02, 14:30"
      return date.toLocaleDateString([], { month: 'short', day: '2-digit' }) + ', ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Longer ranges: show "Apr 02"
      return date.toLocaleDateString([], { month: 'short', day: '2-digit' });
    }
  };

  // Group by the actual timestamp ISO string to prevent cross-day merging
  const grouped = rawData.reduce((acc, curr) => {
    const date = new Date(curr.timestamp);
    // Use ISO string as key for uniqueness, but store readable label
    const isoKey = date.toISOString();
    
    if (!acc[isoKey]) {
      acc[isoKey] = { time: formatTimeLabel(date), _ts: date.getTime() };
    }
    
    // Map the metricType to a clean key for the chart
    if (curr.metadata.metricType === 'solar_wind_speed') acc[isoKey].speed = curr.value;
    if (curr.metadata.metricType === 'solar_wind_density') acc[isoKey].density = curr.value;
    if (curr.metadata.metricType === 'solar_wind_bz') acc[isoKey].bz = curr.value;
    if (curr.metadata.metricType === 'solar_flare') acc[isoKey].flare = curr.value;
    if (curr.metadata.metricType === 'kp_index') acc[isoKey].kp = curr.value;
    if (curr.metadata.metricType === 'xray_flux') acc[isoKey].xray = curr.value;
    if (curr.metadata.metricType === 'electron_flux') acc[isoKey].electrons = curr.value;

    return acc;
  }, {});

  // Sort by actual timestamp, then return
  const sorted = Object.values(grouped).sort((a, b) => a._ts - b._ts);

  // Forward-fill sparse metrics (Kp is every 3hr, X-Ray/Electrons on different schedules)
  // This ensures the correlation chart has continuous lines for all metrics
  const fillKeys = ['speed', 'density', 'bz', 'kp', 'xray', 'electrons'];
  const lastKnown = {};
  for (const point of sorted) {
    for (const key of fillKeys) {
      if (point[key] != null) {
        lastKnown[key] = point[key];
      } else if (lastKnown[key] != null) {
        point[key] = lastKnown[key];
      }
    }
  }

  return sorted;
};

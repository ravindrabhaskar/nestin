export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  const headerRow = keys.join(',');

  const csvRows = rows.map((row) => {
    return keys
      .map((k) => {
        const val = row[k];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...csvRows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

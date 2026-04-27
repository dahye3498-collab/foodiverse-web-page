export default async function handler(req, res) {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: '\uCCB4\uD06C\uBC15\uC2A4',
            checkbox: { equals: true },
          },
          sorts: [{ property: '\uB0A0\uC9DC', direction: 'descending' }],
          page_size: 3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();

    const reports = data.results.map((page) => {
      const props = page.properties;

      // Find title property (type: 'title')
      let title = '';
      for (const key of Object.keys(props)) {
        if (props[key].type === 'title' && props[key].title.length > 0) {
          title = props[key].title[0].plain_text;
          break;
        }
      }

      // Date
      const dateRaw = props['\uB0A0\uC9DC']?.date?.start || '';
      const date = dateRaw ? dateRaw.replace(/-/g, '.') : '';

      // Category
      const category = props['\uC120\uD0DD']?.select?.name || '';

      // Excerpt (Summary)
      const excerpt =
        props['Summary']?.rich_text?.[0]?.plain_text || '';

      return { title, date, category, excerpt };
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

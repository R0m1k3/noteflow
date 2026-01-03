// Script pour tester le parsing RSS avec le User-Agent
const Parser = require('rss-parser');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    timeout: 30000
});

const testUrl = 'https://fresh.vonrodbox.eu/i/?a=rss&user=Michael&token=Lapin2509&hours=168';

console.log('Testing RSS feed:', testUrl);
console.log('---');

parser.parseURL(testUrl)
    .then(feed => {
        console.log('SUCCESS!');
        console.log('Title:', feed.title);
        console.log('Description:', feed.description);
        console.log('Items count:', feed.items?.length);
        if (feed.items?.length > 0) {
            console.log('\nFirst 3 items:');
            feed.items.slice(0, 3).forEach((item, i) => {
                console.log(`  ${i + 1}. ${item.title}`);
            });
        }
    })
    .catch(err => {
        console.error('ERROR:', err.message);
        console.error('Full error:', err);
    });

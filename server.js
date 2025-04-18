const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();
const port = 5000;

app.use(express.json());

app.get('/api/data', (req, res) => {
    const { ticker, interval } = req.query;
    const startDate = interval === '1h' ? '2025-01-17' : '2015-01-01';
    const pythonScript = interval === '1h' ? 'fetch_data.py' : 'fetch_data_1d.py';
    const outputFile = interval === '1h' ? 'stock_data_1h.csv' : 'stock_data_1d.csv';

    const pythonProcess = spawn('python', [pythonScript, ticker, startDate, `2025-04-18`, interval]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            const data = fs
                .readFileSync(outputFile, 'utf8')
                .split('\n')
                .slice(1)
                .map((row) =>
                    row.split(',').reduce((acc, val, i) => {
                        acc[
                            Object.keys({
                                Datetime: '',
                                Open: '',
                                High: '',
                                Low: '',
                                Close: '',
                                'Adj Close': '',
                                Volume: '',
                            })[i] || 'support'
                        ] = val;
                        return acc;
                    }, {})
                );
            const supportScript = spawn('python', ['find_support_levels.py', interval]);
            supportScript.stdout.on('data', (supportData) => {
                const supportLines = supportData
                    .toString()
                    .split('\n')
                    .filter((line) => line.includes('Support Range'));
                const supports = supportLines.map((line) => {
                    const [range, count] = line.match(/\d+\.\d+-\d+\.\d+/)[0].split('-');
                    return {
                        supportMin: parseFloat(range.split('-')[0]),
                        supportMax: parseFloat(range.split('-')[1]),
                        count: parseInt(count),
                    };
                });
                data.forEach((d, i) => {
                    if (supports.length > i)
                        (d.support = true),
                            (d.supportMin = supports[i].supportMin),
                            (d.supportMax = supports[i].supportMax);
                });
                res.json(data);
            });
            supportScript.stderr.on('data', (data) => console.error(`Support error: ${data}`));
            supportScript.on('close', (code) => console.log(`Support script exited with code ${code}`));
        } else {
            res.status(500).send('Error executing Python script');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

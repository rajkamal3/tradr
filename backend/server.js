const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

app.get('/api/data', (req, res) => {
    const { ticker, interval } = req.query;
    console.log(`Request received for ${ticker} on ${interval}`);
    const startDate = interval === '1h' ? '2025-01-17' : '2015-01-01';
    const pythonScript = 'fetch_data.py'; // Use single script for all intervals
    const outputFile = interval === '1h' ? 'stock_data_1h.csv' : 'stock_data_1d.csv';

    const pythonProcess = spawn('python', [pythonScript, ticker, startDate, '2025-04-18', interval]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
            if (fs.existsSync(outputFile)) {
                const data = fs
                    .readFileSync(outputFile, 'utf8')
                    .split('\n')
                    .slice(1)
                    .filter((row) => row)
                    .map((row) => {
                        const [Datetime, Open, High, Low, Close, AdjClose, Volume] = row.split(',');
                        return { Datetime, Open, High, Low, Close, AdjClose, Volume };
                    });

                const supportProcess = spawn('python', ['find_support_levels.py', interval]);
                let supportOutput = '';
                supportProcess.stdout.on('data', (data) => {
                    supportOutput += data.toString();
                });
                supportProcess.stderr.on('data', (data) => console.error(`Support error: ${data}`));
                supportProcess.on('close', (code) => {
                    console.log(`Support process exited with code ${code}`);
                    if (code === 0) {
                        const supportLines = supportOutput.split('\n').filter((line) => line.includes('Support Range'));
                        const supports = supportLines
                            .map((line) => {
                                const match = line.match(/(\d+\.\d+)-(\d+\.\d+)/);
                                return match
                                    ? { supportMin: parseFloat(match[1]), supportMax: parseFloat(match[2]) }
                                    : null;
                            })
                            .filter((s) => s);

                        data.forEach((d, i) => {
                            if (supports[i])
                                (d.support = true),
                                    (d.supportMin = supports[i].supportMin),
                                    (d.supportMax = supports[i].supportMax);
                        });
                        res.json(data);
                    } else {
                        res.status(500).send('Support script failed: ' + supportOutput);
                    }
                });
            } else {
                res.status(500).send('Output file not found');
            }
        } else {
            res.status(500).send('Python script failed: ' + stderr);
        }
    });

    pythonProcess.on('error', (error) => {
        console.error('Python execution error:', error);
        res.status(500).send('Python execution error: ' + error.message);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    process.stdin.resume();
});

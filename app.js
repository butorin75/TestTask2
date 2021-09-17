const puppeteer = require('puppeteer');
const config = require('./dbcfg.json');
const mysql  = require('mysql');
const date_format = require('date-format-parse');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    let page = await browser.newPage();
    await page.goto('https://develop.pub.afflu.net');
    const userHandle = await page.$('input[name="username"]');
    await userHandle.type('developertest@affluent.io');
    const passHandle = await page.$('input[name="password"]');
    await passHandle.type('Wn4F6g*N88EPiOyW');
    await page.evaluate(() => {
        document.querySelector('button[type=submit]').click();
      })

    page.once('load', async() => {
        console.log('Login completed!')
        await delay(5000);

        page.goto('https://develop.pub.afflu.net/list?type=dates&startDate=2020-10-01&endDate=2020-10-31');
        page.once('load', async() => {
            await delay(2000);
            console.log('Ready to fetch');
            await page.evaluate(() => {
                console.log('selecting all');
                document.getElementsByClassName('btn dropdown-toggle btn-default btn-sm')[0].click();
                document.getElementsByClassName('dropdown-menu inner')[2].children[6].firstChild.firstChild.click();
            })
            await delay(2000); // Waiting for data to refesh after selecting 'ALL'
            const bodyHandle = await page.$('body');
            const text = await page.evaluate((body) => document.getElementById('DataTables_Table_0').children[1].innerText, bodyHandle);
            console.log(text);

            let connection = mysql.createConnection(config);
            connection.connect();
            connection.query('CREATE TABLE IF NOT EXISTS dates_table(' +
                'creation DATE,' +
                'commision FLOAT,' +
                'sales INT,' +
                'leads INT,' +
                'clicks INT,' +
                'epc FLOAT,' +
                'impressions INT,' +
                'cr FLOAT)');
            connection.query('TRUNCATE TABLE dates_table');

            const rows = text.split('\n');
            rows.forEach((row) => {
                const cols = row.split('\t');
                if (cols.length >= 8) {
                    let opcode = "INSERT INTO dates_table VALUES(";
                    const date = date_format.parse(cols[0], 'MMM DD, YYYY');
                    opcode += date_format.format(date, "'YYYY-MM-DD'");
                    for(var i = 1; i < cols.length; i++){
                        var val = cols[i].replace('$', '');
                        val = val.replace('%', '');
                        opcode += ',' + val.replace(',', '');
                    }
                    opcode += ')';
                    connection.query(opcode);
                }
            })
            connection.end();
            await browser.close();
            console.log('Finished.');
        })
    })

  })();
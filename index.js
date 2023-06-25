import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
  try {
  const { username, password } = req.body;

  const sid = await fetch('https://websinu.utcluj.ro/note/default.asp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=' + username + '&password=' + password,
  })
    .then(response => response.text())
    .then(html => {
      const root = parse(html);
      return root.querySelector('input').rawAttributes.value;
    });

  const fac = await fetch('https://websinu.utcluj.ro/note/roluri.asp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'sid=' + sid
  })
    .then(response => response.text())
    .then(html => {
      const root = parse(html)
      let facultate = ''
      let specializare = ''
      root.querySelectorAll("td").forEach(element => {
        let pos = element.text.search('Facultatea')
        if (pos != -1) {
          let pos1 = element.text.search(',')
          facultate = element.text.substring(pos, pos1).replace(/ /g, '+')
          let spec = element.text.search(':')
          spec += 2
          let spec1 = element.text.search(' - Vizualizare')
          specializare = element.text.substring(spec, spec1).replace(/ /g, '+')
          specializare = specializare.replace('(', '%28')
          specializare = specializare.replace(')', '%29')
        }
      })
      return { 'facultate': facultate, 'specializare': specializare }
    });

  const materii = await fetch('https://websinu.utcluj.ro/note/roluri.asp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'hidSelfSubmit=roluri.asp&sid=' + sid + '&hidOperation=N&hidNume_Facultate=' + fac.facultate + '&hidNume_Specializare=' + fac.specializare
  })
    .then(response => response.text())
    .then(html => {
      const root = parse(html)
      const tab = root.querySelectorAll("td")
      tab.pop()
      tab.pop()

      let index = 0;
      for (let i = 0; i < tab.length; i++) {
        if (tab[i].text == 'An') {
          i += 6
          index = i;
          break;
        }
      }

      let arr = []
      let materie = {
        an: '',
        semestru: '',
        nume: '',
        notare: '',
        data: '',
        nota: '', 
      }

      for (let i = index; i < tab.length; i++) {
        if (((i - index) % 6) == 0) materie.an = tab[i].text
        if (((i - index) % 6) == 1) materie.semestru = tab[i].text
        if (((i - index) % 6) == 2) materie.nume = tab[i].text
        if (((i - index) % 6) == 3) materie.notare = tab[i].text
        if (((i - index) % 6) == 4) materie.data = tab[i].text
        if (((i - index) % 6) == 5) {
          materie.nota = tab[i].text
          arr.push(materie)
          materie = { an: '', semestru: '', nume: '', notare: '', data: '', nota: '' }
        }
      }
      return arr;
    });


  res.json({ sid, fac, materii });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred during scraping");
  }
});

const server = app.listen(3000, () => console.log('Server started on port 3000'));

// Set the server timeout to 5 minutes
server.timeout = 300000;
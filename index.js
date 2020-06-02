// dotenv loads parameters (port and database config) from .env
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const connection = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// GET - Retrieve all of the data from your table on `/api/players`
//http://localhost:3000/api/players
app.get('/api/players', (req, res) => {
  connection.query('SELECT * FROM player', (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

//GET - Retrieve specific fields (i.e. id, names, dates, etc.)
//http://localhost:3000/api/players/firstnames
field=['id','firstname', 'isok', 'nbgame', 'datelastgame']

for (let i=0; i<field.length; i++) {
    app.get(`/api/players/${field[i]}s`, (res) => {

        connection.query(`SELECT ${field[i]} from player`, (err, results) => {
            if (err) {
                res.status(500).json({
                  error: err.message,
                  sql: err.sql,
                });
              } else {
                res.json(results);
              }
            });
          });
}


//GET - Retrieve fields query ?field=''
//http://localhost:3000/api/players/search?firstname=toto
app.get('/api/players/search', (request, response) => {
    const query = request.query;
    let sql = 'SELECT * FROM player WHERE ';
    let sqlValues = [];

    Object.keys(query).map((key, index) => {
        if (index === Object.keys(query).length - 1) {
            sql += `${key} = ?`
        } else {
            sql += `${key} = ? AND `
        }
        sqlValues.push(query[key])
    })

    connection.query(sql, sqlValues, (err, results) => {
        if (err) {
            response.status(500).send('Internal server error')
        } else {
            if (!results.length) {
                response.status(404).send('player not found')
            } else {
                response.json(results)
            }
        }
    })
})

//GET - Retrieve a data set with the following filters (use one route per filter type)
//A filter for data that contains... (e.g. name containing the string 'wcs')
//http://localhost:3000/api/players/firstnames/like?firstname=ot

app.get('/api/players/firstnames/like', (request, response) => {
    let sql = 'SELECT * FROM player';
    const sqlValues = []

    if (request.query.firstname) {
      sql += ' WHERE firstname LIKE "%" ? "%"';
      sqlValues.push(request.query.firstname);
    }
  
    connection.query(sql, sqlValues, (err, results) => {
      if (err) {
        return response.status(500).send(`An error occurred: ${err.message}`);
      }
      if (results.length === 0) {
        return response.status(404).send('player not found');
      }
      // If everything went well, we send the result of the SQL query as JSON
      return response.json(results);
    });
  });

//A filter for data that starts with... (e.g. name beginning with 'campus')
//http://localhost:3000/api/players/firstnames/begin?firstname=t
app.get('/api/players/firstnames/begin', (request, response) => {
    
    let sql = 'SELECT * FROM player';
    const sqlValues = []

    if (request.query.firstname) {
      sql += ' WHERE firstname LIKE ? "%"';
      sqlValues.push(request.query.firstname);
    }
  
    connection.query(sql, sqlValues, (err, results) => {
      if (err) {
        return response.status(500).send(`An error occurred: ${err.message}`);
      }
      if (results.length === 0) {
        return response.status(404).send('player not found');
      }
      // If everything went well, we send the result of the SQL query as JSON
      return response.json(results);
    });
  });

//A filter for data that is greater than... (e.g. date greater than 18/10/2010)
//http://localhost:3000/api/players/datelastgames/sup?datelastgame=2018-04-20
app.get('/api/players/datelastgames/sup', (request, response) => {
    
    let sql = 'SELECT * FROM player';
    const sqlValues = []

    if (request.query.datelastgame) {
      sql += ' WHERE datelastgame > ? ';
      sqlValues.push(request.query.datelastgame);
    }
  
    connection.query(sql, sqlValues, (err, results) => {
      if (err) {
        return response.status(500).send(`An error occurred: ${err.message}`);
      }
      if (results.length === 0) {
        return response.status(404).send('player not found');
      }
      // If everything went well, we send the result of the SQL query as JSON
      return response.json(results);
    });
  });


  //GET - Ordered data recovery (i.e. ascending, descending) - The order should be passed as a route parameter
    app.get('/api/players/desc', (req, res) => {
        connection.query('SELECT * FROM player ORDER BY firstname DESC', (err, results) => {
          if (err) {
            res.status(500).json({
              error: err.message,
              sql: err.sql,
            });
          } else {
            res.json(results);
          }
        });
      });
    

 //validation 
  const playerValidationMiddlewares = [
    check('datelastgame').isISO8601(),
    check('nbgame').isInt(),
    check('isok').isBoolean(),
    check('firstname').isLength({ min: 2 }),
  ]
  
  
  //POST - Insertion of a new entity
  app.post('/api/players',playerValidationMiddlewares,
  (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return connection.query('INSERT INTO player SET ?', req.body, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    }
    return connection.query('SELECT * FROM player WHERE id = ?', results.insertId, (err2, records) => {
      if (err2) {
        return res.status(500).json({
          error: err2.message,
          sql: err2.sql,
        });
      }
      const insertedPlayer = records[0];
      // Get the host + port (localhost:3000) from the request headers
      const host = req.get('host');
      // Compute the full location, e.g. http://localhost:3000/api/player/7
      // This will help the client know where the new resource can be found!
      const location = `http://${host}${req.url}/${insertedPlayer.id}`;
      console.log(location)
      return res
        .status(201)
        .set('Location', location)
        .json(insertedPlayer);
        
    });
  });
});
  
  //PUT - Modification of an entity
  
  app.put(
    '/api/players/:id',
    playerValidationMiddlewares,
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      // récupération des données envoyées
      const idPlayer = req.params.id;
      const formData = req.body;
      return connection.query('UPDATE player SET ? WHERE id = ?', [formData, idPlayer], (err) => {
        if (err) {
          // If an error has occurred, then the client is informed of the error
          return res.status(500).json({
            error: err.message,
            sql: err.sql,
          });
        }
        // answer
        return connection.query('SELECT * FROM player WHERE id = ?', idPlayer, (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
  
          // If all went well, records is an array, from which we use the 1st item
          const updatedPlayer = records[0];
          // Get the host + port (localhost:3000) from the request headers
          const host = req.get('host');
          // Compute the full location, e.g. http://localhost:3000/api/users/132
          // This will help the client know where the new resource can be found!
          const location = `http://${host}${req.url}/${updatedPlayer.id}`;
          return res
            .status(200)
            .set('Location', location)
            .json(updatedPlayer);
        });
      });
    },
  );
  
//   PUT - Toggle a Boolean value
//http://localhost:3000/api/players/5/toogle
  app.put(
    '/api/players/:id/toogle',
    (req, res) => {
      const idPlayer = req.params.id;
      return connection.query('UPDATE player SET isok = 1-SIGN(isok) WHERE id = ?', [idPlayer], (err) => {
        if (err) {
          // If an error has occurred, then the client is informed of the error
          return res.status(500).json({
            error: err.message,
            sql: err.sql,
          });
        }
        // answer
        return connection.query('SELECT * FROM player WHERE id = ?', idPlayer, (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
  
          // If all went well, records is an array, from which we use the 1st item
          const updatedPlayer = records[0];
          // Get the host + port (localhost:3000) from the request headers
          const host = req.get('host');
          // Compute the full location, e.g. http://localhost:3000/api/users/132
          // This will help the client know where the new resource can be found!
          const location = `http://${host}${req.url}/${updatedPlayer.id}`;
          return res
            .status(200)
            .set('Location', location)
            .json(updatedPlayer);
        });
      });
    },
  );
  
  
  //DELETE - Delete an entity
app.delete('/api/players/:id', (req, res) => {

    const idPlayer = req.params.id;
    // connection to the database, and delete the player
    connection.query('DELETE FROM player WHERE id = ?', [idPlayer], err => {
      if (err) {
         console.log(err);
        res.status(500).send("Error deleting a player");
      } else {
        res.sendStatus(200);
      }
    });
  });
  
  
  //DELETE - Delete all entities where boolean value is false
  app.delete('/api/players/isok0', (res) => {
    connection.query('DELETE FROM player WHERE isok = 0', (err) => {
      if (err) {
        res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      } else {
        res.sendStatus(200);
      }
    });
  });



app.listen(process.env.PORT, (err) => {
  if (err) {
    throw new Error('Something bad happened...');
  }

  console.log(`Server is listening on ${process.env.PORT}`);
});
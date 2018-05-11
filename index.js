const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// CONNECT TO DB
const DB = new Sequelize('database', null, null, {
  dialect: 'sqlite',
  storage: 'db/database.db'
})

// TEST CONNECTION (http://docs.sequelizejs.com/manual/installation/getting-started.html)
DB
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // get films from database with same genre, released within 15 years sorted by film id
  DB.query(`
    SELECT 
      films.id AS id,
      title,
      release_date AS releaseDate,
      genres.name AS genre
    FROM 'films'
    JOIN genres ON genres.id = films.genre_id
    WHERE 
      genres.id = (SELECT genre_id FROM 'films' WHERE id = $1)
      AND cast(release_date AS string) > cast((SELECT release_date FROM 'films' WHERE id = $1) - '15' AS string)
      AND cast(release_date AS string) < cast((SELECT release_date FROM 'films' WHERE id = $1) + '15' AS string)
    ORDER BY films.id ASC;`,
    { bind: [req.params.id], type: DB.QueryTypes.SELECT}
  ).then(films => {
    console.log(films); // check films accurately retrieved
    // make outside api call with string of movie_id's
    
    if(films.length != 0){
      const OUTSIDE_API = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
      let url = OUTSIDE_API + '?films=' + films[0].id;
      for(let i = 1; i < films.length; i++){
        url += `,${films[i].id}`
      }

      request({
        method: 'GET',
        uri: url
      }, (error, response, body) => {
        if(response.statusCode == 200){
          console.log('correct retrieval of reviews \n' + body);
        } else {
          films = [];
          console.log('error: ' + response.statusCode);
          console.log(body);
        }
      })
    }

    // check reviews from each film and pop from array if < 5 reviews and average rating <= 4.0
    // by using outside api; save averageRating on object and reviews (num reviews) if good
  }).catch(err => {
    console.log(err);
    res.status(500).send('Database error');
  })

}

module.exports = app;

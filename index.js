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

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // connect to database using DB_PATH and Sequelize
  const DB = new Sequelize('sqlite:./db/database.db');


  // get films from database with same genre, released within 15 years sorted by film id
  /* SQLite query within DB
  
  DB.query()
  SELECT 
    films.id AS id,
    title,
    release_date AS releaseDate,
    genres.name AS genre
  FROM films
  JOIN genres ON genres.id = films.genre_id
  WHERE 
    genres.id = (SELECT genre_id FROM films WHERE id = $1)
    AND cast(release_date AS string) > cast((SELECT release_date FROM films WHERE id = $1) - '15' AS string)
    AND cast(release_date AS string) < cast((SELECT release_date FROM films WHERE id = $1) + '15' AS string)
  ORDER BY films.id ASC;

  */

  // check reviews from each film and pop from array if < 5 reviews and average rating <= 4.0
  // by using outside api; save averageRating on object and reviews (num reviews) if good


  res.status(500).send('Not Implemented');
}

module.exports = app;

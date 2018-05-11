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
          const PARSED_BODY = JSON.parse(body);
          console.log('correct retrieval of reviews');

          // check for num ratings >= 5 and avg rating >= 4.0
          let filmTracker = 0;
          for(let i = 0; i < PARSED_BODY.length; i++){
            if(PARSED_BODY[i].reviews.length >= 5) {
              let ratingSum = 0;
              for(let j = 0; j < PARSED_BODY[i].reviews.length; j++){
                ratingSum += PARSED_BODY[i].reviews[j].rating;
              }
              const RATING_AVG = ratingSum / PARSED_BODY[i].reviews.length;
              if(RATING_AVG >= 4.0){
                // if rating avg and total fit spec, add them to film object and increase tracker
                films[filmTracker].averageRating = Math.round(RATING_AVG * 100) / 100;
                films[filmTracker].reviews = PARSED_BODY[i].reviews.length;
                filmTracker++;
              } else {
                // remove film that has poor average rating
                films.splice(filmTracker, 1);
              }
            } else {
              // remove film that has too few ratings
              films.splice(filmTracker, 1);
            }
          }
          
          // HANDLE OFFSET PROCESSING
          let offset = 0;
          if(req.query.hasOwnProperty('offset')){
            offset = parseInt(req.query.offset);
          }
          for(let i = 0; i < offset; i++){
            films.shift();
          }
          

          // HANDLE LIMIT PROCESSING
          let limit = 10;
          if(req.query.hasOwnProperty('limit')){
            limit = parseInt(req.query.limit);
          }
          while(films.length > limit){
            films.pop();
          }

          res.status(200).json({
            recommendations: films,
            meta: {
              "limit": limit,
              "offset": offset
            }
          })
        } else {
          console.log('error: ' + response.statusCode);
          console.log(body);
        }
      })
    }
  }).catch(err => {
    console.log(err);
    res.status(500).json({
      message: err
    });
  })
}

module.exports = app;

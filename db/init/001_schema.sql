CREATE SCHEMA movies;
CREATE SCHEMA ratings;

CREATE TABLE movies.movies (
  movie_id             INTEGER PRIMARY KEY,
  imdb_id              TEXT NOT NULL,      
  title                TEXT NOT NULL,
  overview             TEXT,
  production_companies JSONB,
  release_date         DATE,
  budget               BIGINT,
  revenue              BIGINT,
  runtime              REAL,
  language             TEXT,
  genres               JSONB,
  genre_names          TEXT[] NOT NULL DEFAULT '{}',  -- lowercased names, filled by seed
  status               TEXT
);

CREATE UNIQUE INDEX movies_imdb_id_key ON movies.movies (imdb_id) WHERE imdb_id <> '';
CREATE INDEX movies_release_date_idx ON movies.movies (release_date, movie_id);
CREATE INDEX movies_genre_names_idx  ON movies.movies USING GIN (genre_names);

CREATE TABLE ratings.ratings (
  rating_id   INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  movie_id    INTEGER NOT NULL,
  rating      REAL NOT NULL,
  "timestamp" BIGINT NOT NULL
);

CREATE INDEX ratings_movie_id_idx ON ratings.ratings (movie_id);
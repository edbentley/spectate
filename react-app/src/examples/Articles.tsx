import React from "react";
import {
  useSpec,
  NewSpec,
  newEffect,
  newText,
  newVarList,
} from "../../../src/react";

type ArticleJson = {
  articles: {
    title: string;
  }[];
};

const myHomepageSpec = (newSpec: NewSpec) => {
  const ArticleTitles = newVarList(newText());
  const Status = newText();

  const FetchArticles = newEffect(async () => {
    const response = await fetch(
      `https://conduit.productionready.io/api/articles?limit=10&offset=0`
    );
    if (response.ok) {
      const json = (await response.json()) as ArticleJson;
      return json.articles.map((a) => a.title);
    }
    return [];
  });

  newSpec("Can show article list", ({ getEffect, equals }) => {
    equals(Status, "Loading");

    const result = getEffect(FetchArticles, ["My title 1", "My title 2"]);

    equals(ArticleTitles, result);
    equals(Status, "");
  });

  newSpec("Shows error if can't load", ({ getEffect, equals }) => {
    equals(Status, "Loading");

    getEffect(FetchArticles, []);

    equals(ArticleTitles, []);
    equals(Status, "Couldn't get articles");
  });

  return {
    ArticleTitles,
    Status,
  };
};

function App() {
  const props = useSpec(myHomepageSpec);

  return (
    <div className="App">
      {props.ArticleTitles.length > 0 && (
        <span>Article titles: {props.ArticleTitles.join(", ")}</span>
      )}
      {props.Status && <span>{props.Status}</span>}
    </div>
  );
}

export default App;

import "./App.css";
import Recommendation from "./components/Recommendation";
import SearchBar from "./components/SearchBar";

function App() {
  return (
    <>
      <div className="search_container">
        <SearchBar />
        <Recommendation />
      </div>
    </>
  );
}

export default App;

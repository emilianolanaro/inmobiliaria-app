import MapView from "./modules/map/presentation/MapView";
import { useMapStore } from "./modules/map/application/useMapStore";

import "./App.css";

function App() {
  const baseMapVisible = useMapStore(
    (state) => state.baseMapVisible,
  );

  const layers = useMapStore(
    (state) => state.layers,
  );

  const setBaseMapVisible = useMapStore(
    (state) => state.setBaseMapVisible,
  );

  const setLayerVisible = useMapStore(
    (state) => state.setLayerVisible,
  );
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1>Sistema Inmobiliario</h1>
          <span className="topbar__subtitle">GIS & CRM</span>
        </div>

        <div className="topbar__actions">
          <div className="connection-status">
            <span className="connection-status__dot" />
            Desarrollo
          </div>

          <button className="topbar__button" type="button">
            Configuración
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <section className="sidebar__section">
            <h2>Vista del mapa</h2>

            <label className="field">
              <span>Proveedor</span>
              <select defaultValue="local">
                <option value="local">Mapa local</option>
              </select>
            </label>

            <label className="field">
              <span>Tipo de vista</span>
              <select defaultValue="map">
                <option value="map">Mapa</option>
              </select>
            </label>
          </section>

          <section className="sidebar__section">
            <h2>Capas</h2>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={baseMapVisible}
                onChange={(event) =>
                  setBaseMapVisible(event.target.checked)
                }
              />
              Mapa base
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={layers.neighborhoods}
                onChange={(event) =>
                  setLayerVisible(
                    "neighborhoods",
                    event.target.checked,
                  )
                }
              />
              Barrios
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={layers.blocks}
                onChange={(event) =>
                  setLayerVisible("blocks", event.target.checked)
                }
              />
              Manzanas
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={layers.parcels}
                onChange={(event) =>
                  setLayerVisible("parcels", event.target.checked)
                }
              />
              Parcelas
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={layers.properties}
                onChange={(event) =>
                  setLayerVisible(
                    "properties",
                    event.target.checked,
                  )
                }
              />
              Propiedades
            </label>
          </section>

          <section className="sidebar__section">
            <h2>Filtros</h2>

            <label className="field">
              <span>Tipo de inmueble</span>
              <select defaultValue="">
                <option value="">Todos</option>
                <option value="house">Casa</option>
                <option value="lot">Lote</option>
                <option value="apartment">Departamento</option>
                <option value="commercial">Local comercial</option>
              </select>
            </label>

            <label className="field">
              <span>Operación</span>
              <select defaultValue="">
                <option value="">Todas</option>
                <option value="sale">Venta</option>
                <option value="rent">Alquiler</option>
              </select>
            </label>

            <button className="primary-button" type="button">
              Aplicar filtros
            </button>
          </section>
        </aside>

        <main className="map-area">
          <MapView />
        </main>
      </div>

      <footer className="statusbar">
        <span>Mapa base online temporal</span>
        <span>Versión 0.1.0</span>
      </footer>
    </div>
  );
}

export default App;
# Vehicle API testing (Phase 1.6)

## Postman

Collection: `Vehicle_API_Collection.json`

### Import

1. Open Postman → **Import** → select this file.
2. Confirm collection variable `baseUrl` = `http://127.0.0.1:8000`.
3. Start FastAPI locally, apply migrations, optionally seed data.

### Suggested order

1. **16 — Empty DB** (only if `vehicles` table is empty / before seeding)
2. **CRUD Happy Path** (create → list → pagination → get → update → delete); creates `vehicleId`
3. **Filters and Sorting** (best after seeding sample data)
4. **Error Cases** (404 / 422)

All 16 required scenarios are included with status and body assertions.

### Collection variables

| Variable   | Default                   | Notes                                      |
|------------|---------------------------|--------------------------------------------|
| `baseUrl`  | `http://127.0.0.1:8000`   | API root                                   |
| `vehicleId`| (set by Create request)   | Used by get / update / delete happy path   |

## Swagger UI

With the API running:

1. Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
2. Expand **vehicles** endpoints
3. Use **Try it out** for create / list (with query filters) / get / update / delete
4. Review schemas under **Schemas** (`VehicleCreate`, `VehicleUpdate`, `VehicleListResponse`, etc.)

Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

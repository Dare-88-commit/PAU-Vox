
  # Complete Frontend Development

  This is a code bundle for Complete Frontend Development. The original project is available at https://www.figma.com/design/xxHLi4EamG6MZYJ0XXVfCn/Complete-Frontend-Development.

  ## Running the code

  Run `npm i` to install the dependencies.

  Create a `.env` file (or copy `.env.example`) and set:
  - `VITE_API_BASE_URL=http://localhost:8000/api/v1`

  Run `npm run dev` to start the development server.

  Backend now lives in `backend/`. Start it separately:
  - `cd backend`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --port 8000`
  

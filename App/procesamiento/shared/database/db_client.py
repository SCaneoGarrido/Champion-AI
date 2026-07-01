import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool

from config import Config

logger = logging.getLogger(__name__)

_pool = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            dbname=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            connect_timeout=10,
        )
        logger.info("DB connection pool inicializado")
    return _pool


@contextmanager
def _connection():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def query_function(sql: str, params: tuple = ()) -> list:
    """Ejecuta una SQL function (SELECT) y devuelve los resultados como lista de dicts."""
    with _connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def call_procedure(sql: str, params: tuple = ()) -> None:
    """Ejecuta un stored procedure (CALL) y hace commit."""
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()

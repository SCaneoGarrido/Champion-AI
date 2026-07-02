"""
Conversión determinística de mind_map_json (generado por IA) a sintaxis Mermaid `mindmap`.

Esto NO es una etapa de IA — es una proyección de datos ya existentes, en la misma
categoría que "Chapters" en el criterio de App/Docs/product/02-knowledge-pack-spec.md
("¿requiere una etapa de IA nueva o es una proyección de datos ya existentes?").
No modifica ni reemplaza mind_map_json, que sigue siendo la fuente de verdad — ver
App/Knowledge/ADR/ADR-008-client-side-rendering.md.

Se invoca directo en el orquestador (código puro, sin I/O) — no es una Activity.
"""

import re

_INDENT = "  "
_MAX_DEPTH = 6  # límite defensivo — no debe truncar el máximo real del prompt (4), solo blindar contra recursión mal formada


def _quote(text) -> str:
    """
    Envuelve el texto en comillas dobles — la sintaxis Mermaid mindmap trata todo lo
    que está entre comillas como texto literal, sin interpretar paréntesis/llaves como
    marcadores de forma. Blinda contra cualquier carácter significativo que el modelo
    haya podido incluir en un nombre de nodo.
    """
    clean = re.sub(r"\s+", " ", str(text or "")).strip()
    clean = clean.replace('"', "'")
    if not clean:
        clean = "(sin título)"
    return f'"{clean}"'


def _walk(nodes, depth: int, lines: list[str]) -> None:
    if not nodes or depth > _MAX_DEPTH:
        return
    for node in nodes:
        if not isinstance(node, dict):
            continue
        name = node.get("name")
        if not name:
            continue
        lines.append(f"{_INDENT * depth}{_quote(name)}")
        _walk(node.get("children"), depth + 1, lines)


def mind_map_json_to_mermaid(mind_map_json: dict) -> str:
    """
    Convierte {title, nodes:[{name, children:[]}]} en sintaxis Mermaid `mindmap`.

    Determinístico y defensivo — nunca lanza excepción. Si el árbol está vacío o mal
    formado, devuelve un mindmap mínimo con el título (o un placeholder) en vez de
    fallar el pipeline por un problema de presentación.
    """
    if not isinstance(mind_map_json, dict):
        mind_map_json = {}

    title = mind_map_json.get("title") or "Mapa mental"
    nodes = mind_map_json.get("nodes") or []

    lines = ["mindmap", f"{_INDENT}{_quote(title)}"]
    _walk(nodes, 2, lines)  # los hijos directos del root van en el nivel de indentación 2

    return "\n".join(lines)

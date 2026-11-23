# language: es
@web
Característica: Formularios en la versión web
  Como usuario de la versión web en escritorio
  Quiero formularios cómodos de llenar
  Para no perderme en campos estirados a todo el ancho de la pantalla

  Esquema del escenario: Los formularios se muestran como tarjeta centrada
    Dado que uso Planify en un navegador de al menos 768 px de ancho
    Cuando abro "<formulario>"
    Entonces el formulario aparece en una tarjeta centrada de máximo 640 px de ancho

    Ejemplos:
      | formulario                 |
      | Nuevo Movimiento           |
      | Nueva Transferencia        |
      | Nuevo Presupuesto          |
      | Nueva Meta                 |
      | Nueva Deuda                |
      | Nuevo Recordatorio         |
      | Nueva Lista de Seguimiento |
      | Generar Reporte            |
      | Editar Perfil              |

  Escenario: En pantallas angostas el formulario ocupa todo el ancho
    Dado que uso Planify en un navegador de menos de 768 px de ancho
    Cuando abro "Nueva Meta"
    Entonces el formulario ocupa todo el ancho

  Escenario: Los errores de validación se muestran en web
    Dado que uso Planify en un navegador
    Cuando abro "Nueva Meta" y guardo sin nombre
    Entonces el navegador muestra el mensaje "El nombre es obligatorio."

  Escenario: Las confirmaciones funcionan en web
    Dado que uso Planify en un navegador
    Y tengo un presupuesto
    Cuando lo elimino
    Entonces el navegador me pide confirmar
    Y solo se elimina si acepto

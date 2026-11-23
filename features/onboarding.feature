# language: es
Característica: Onboarding
  Como usuario nuevo
  Quiero una introducción guiada
  Para entender cómo usar Planify

  Escenario: Completar el onboarding
    Dado que acabo de crear mi cuenta
    Cuando avanzo por las diapositivas con "Siguiente"
    Y escribo mi nombre o apodo
    Y pulso "Empezar"
    Entonces veo el dashboard
    Y no vuelvo a ver el onboarding al iniciar sesión

  Escenario: El teclado no tapa el formulario en Android
    Dado que estoy en el paso del nombre del onboarding en Android
    Cuando el teclado se abre
    Entonces el campo de nombre y el botón "Empezar" siguen visibles

  Escenario: Guía de una pantalla
    Dado que estoy en una pantalla con guía
    Cuando pulso el botón "?" del encabezado
    Entonces se abre la guía de esa pantalla

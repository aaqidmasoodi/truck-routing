from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("risk-levels/", views.risk_levels, name="risk-levels"),
    path("checkpoint-risk/", views.score_checkpoint, name="checkpoint-risk"),
    path("places/", views.places, name="places"),
    path("routes/", views.routes, name="routes"),
    path("plan/", views.plan, name="plan"),
]

"""
"""
    

async def test_simple_dispute(client) -> None:
    simple_dispute = {
        "claim_1": {
            "person": "Danny",
            "claim": "Adam borrowed my bike with my permission, but then he went and got a bit tipsy at the local pub. Somehow on his way home, he damaged the bike and is now refusing to pay me back for the damage. He is my friend but I'm very upset and I want to be repaid."
        },
        "claim_2": {
            "person": "Adam",
            "claim": "Danny claims I was tipsy while using his bike, but the damage happened out of my control when I parked them in the street. I don't have the money to pay him right now, and I also don't think I should pay for it, as this is not my fault."
        }
    }

    response = await client.post('/api/dispute/randomroom', json=simple_dispute)
    assert response.status_code == 200
    assert 'Danny' in response.json()['right']
    assert 'Adam' not in response.json()['right']

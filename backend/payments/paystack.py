import os
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

class Paystack:
    """
    Paystack API client for handling payment operations.
    """
    
    def __init__(self):
        self.secret_key = os.getenv('PAYSTACK_SECRET_KEY')
        self.base_url = "https://api.paystack.co"
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }
    
    def initialize_transaction(self, email, amount, reference, callback_url, metadata=None):
        """
        Initialize a transaction with Paystack.
        
        Args:
            email (str): Customer's email address
            amount (int): Amount in kobo (smallest currency unit)
            reference (str): Unique transaction reference
            callback_url (str): URL to redirect to after payment
            metadata (dict, optional): Additional transaction data
            
        Returns:
            dict: Response from Paystack API
        """
        url = f"{self.base_url}/transaction/initialize"
        data = {
            'email': email,
            'amount': int(amount * 100),  # Convert to kobo
            'reference': reference,
            'callback_url': callback_url,
            'metadata': metadata or {}
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                'status': False,
                'message': str(e)
            }
    
    def verify_transaction(self, reference):
        """
        Verify a transaction by its reference.
        
        Args:
            reference (str): Transaction reference
            
        Returns:
            dict: Transaction details from Paystack
        """
        url = f"{self.base_url}/transaction/verify/{reference}"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                'status': False,
                'message': str(e)
            }
    
    def create_plan(self, name, amount, interval='monthly', description=None):
        """
        Create a subscription plan.
        
        Args:
            name (str): Name of the plan
            amount (int): Amount in kobo
            interval (str): Billing interval (daily, weekly, monthly, quarterly, yearly)
            description (str, optional): Plan description
            
        Returns:
            dict: Response from Paystack API
        """
        url = f"{self.base_url}/plan"
        data = {
            'name': name,
            'amount': int(amount * 100),  # Convert to kobo
            'interval': interval,
            'description': description or f"{name} plan"
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                'status': False,
                'message': str(e)
            }
    
    def create_subscription(self, customer_email, plan_code, authorization_code, start_date=None):
        """
        Create a subscription for a customer.
        
        Args:
            customer_email (str): Customer's email
            plan_code (str): Plan code from Paystack
            authorization_code (str): Authorization code from customer's card
            start_date (str, optional): When to start the subscription (ISO 8601 format)
            
        Returns:
            dict: Response from Paystack API
        """
        url = f"{self.base_url}/subscription"
        data = {
            'customer': customer_email,
            'plan': plan_code,
            'authorization': authorization_code
        }
        
        if start_date:
            data['start_date'] = start_date
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                'status': False,
                'message': str(e)
            }

# Create a singleton instance
paystack = Paystack()

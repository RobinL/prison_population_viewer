
# coding: utf-8

# In[5]:

import pandas as pd
import re


# In[6]:

url = "https://www.gov.uk/government/uploads/system/uploads/attachment_data/file/523261/monthly-bulletin-16-04.rtf"


# In[7]:

from pyth.plugins.rtf15.reader import Rtf15Reader
from pyth.plugins.xhtml.writer import XHTMLWriter

import urllib2
from cStringIO import StringIO


def get_one_month_from_rtf(url):
	rtf_file = urllib2.urlopen(url)
	rtf_file = StringIO(rtf_file.read())
	doc = Rtf15Reader.read(rtf_file)

	final_data = []

	header = False
	for c in doc.content:
	    full_p = c.content.__repr__().lower()
	    if "capacity" in full_p and "use cna" in full_p:
	        
	        header = True
	        continue
	        
	    if header:
	        row= re.split(r"\t", c.content[0].content[0])
	        if len(row) == 7 :
	            final_data.append(row)

	df = pd.DataFrame(final_data, columns = ["prison_name","baseline_cna", "in_use_cna", "operational_capacity", "population", "perc_pop_to_used_cna", "perc_acc_available"])

	df.iloc[:,1:] = df.iloc[:,1:].replace("%", "", regex=True).replace(",", "", regex=True)



	for c in df.columns:
	    df[c]= pd.to_numeric(df[c], errors='ignore')

	cols = [c for c in df.columns if "perc" in c]
	df.loc[:,cols] = df.loc[:,cols]/100
	return df

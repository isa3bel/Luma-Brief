Tech Dashboard 

Problem 

Since moving to SF, I'm really excited to engage in the tech community, network, and find opportunities. I've been attending multiple network events, workshops, and other tech events where I've expanded my network. But there's no central place for me to track the learnings from events and the people I've met at those events. I'd like to remember which events I go to and the learnings from each of those, as well as who I met at those particular events. 

My tracking is across three sources: Luma (where I find the events), iCal which adds them to my calendar, and LinkedIn where I connect with people at those events. 

Solution 

I'm looking to create a simple dashboard where I can see the events I've attended, basic information about those events like speakers and company sponsors, as well as track who I met at each of those. 

Requirements 

Sign-in 

-   Sign-in option that preserves my information and can be accessed from anywhere. Uses Magic Link option and Supabase. 

Landing Page 

-   Landing page with the title of the product and description of what it can do 

-   This is viewable for people who are signed out 

Main Dashboard Page  

-   Shown upon sign in 

-   At the top, shows past events with two options  at each corner of the tile: Went or Did Not Go. Checking Went keeps it on the calendar, checking Did Not Go, removes it from calendar.  Checking either shows the tile as swiped with animation similar to a dating app. 

-   Animates Right if select Went and animates eft if select Did Not Go 

-   The calendar view below is blurred until the user checks "went" or "did not go".  I.e. clears the events at the top 

-   An event will not show up in the calendar unless the user chose Went 

-   The calendar  view shows all future events indicated as either Pending or Going 

-   Upon clicking on any event, it expands to show the event details such as time, date, place, speakers, topics. There should be a place to put "Learnings" where I can put a brain dump of everything I've learned at that event. I may add additional fields in the future. 

-   I may add learnings for events that I'm currently at. 

-   Adding learnings should be saved to Supbase so that they are not lost and can be accessed again 

-   All events in the calendar for a user should be saved to Supabase 

-   The tile should also list the LinkedIn members that I connected with at that event. 

-   Within LinkedIn, head to My Network tab 

-   Sort by Recently Added 

-   Assign users that I matched with on the day of the event to that tile, as those are the users that I connected with 

Network page 

There should be a second page where it shows all of the people who  I've  met. It should be in a tabular format with the columns: Name, Role, Current Company, Date Connected, Event Connected At, LinkedIn Profile link. Initially sorted by Date Connected from Newest to Oldest. It should only show users that were connected on a day that I had an event. 

The table should be sortable and filterable based on the columns.  

Left Rail 

There should be a left rail with a menu of the pages. The last item on the rail should be a sign out button. 

I will probably add more pages in the future. 

Various Platforms 

This entire web app should be dynamic depending on the platform I'm  using: web or mobile. Everything should be properly adjusted based on the screen size. 

Updating 

Upon going to the web app and loading the page, the app should update the data by pinging the sources to ensure the calendar,  event details, and network are up to date. 

Data Sources 

-   Events should be sourced from Luma <https://luma.com/> 

-   Network people should be sourced from LinkedIn <https://www.linkedin.com/mynetwork/invite-connect/connections/> 

Concerns/Considerations 

-   Luma and LinkedIn both require sign-in and authentication. How can the app access each user's Luma/LinkedIn data? 

-   Maybe as an MVP, it should only use Luma as the Event source and not others. 

-   Maybe the app should restrict users who don't have Luma or LinkedIn, but not sure the right UI behind this. 

-   Does Claud have the tools to access the data from Luma and LinkedIn webpages? What MCPs or tools does it need? 

-   How to keep the data up to date when I load the page?  

-   What is the AI cost associated with loading the page? What web search APIs are required if any and is there a cent cost associated with each one? 

-   If I'm not using the app, my Supabase project will be put on pause. I need a recurring Cron job that hits the database so that it doesn't get paused. 

-   I will probably add pages to this dashboard so it should be malleable.
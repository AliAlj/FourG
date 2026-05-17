const phonetics = {
  'resilience': 'reh-ZIL-ee-ents',
  'largest': 'LAR-jest',
  'eastern': 'EE-stern',
  'community': 'kuh-MYOO-nih-tee',
  'vendors': 'VEN-ders',
  'colorful': 'KUL-er-ful',
  'freshwater': 'FRESH-waw-ter',
  'destination': 'des-tih-NAY-shun',
  'revolutionary': 'rev-uh-LOO-shun-air-ee',
  'manufacturing': 'man-yuh-FAK-cher-ing',
  'automobile': 'AW-toh-moh-beel',
  'prosperity': 'pros-PAIR-ih-tee',
  'contributed': 'kun-TRIB-yoo-ted',
  'dedicated': 'DED-ih-kay-ted',
  'documentation': 'dok-yuh-men-TAY-shun',
  'generations': 'jen-er-AY-shunz',
  'significant': 'sig-NIF-ih-kant',
  'traditionally': 'truh-DISH-un-uh-lee',
  'emancipation': 'ee-man-sih-PAY-shun',
  'abolitionists': 'ab-uh-LISH-un-ists'
};

const passages = [
  {
    grade: 4,
    topic: "Detroit History",
    title: "Eastern Market: The Heart of Detroit",
    text: "Eastern Market in Detroit is one of the oldest and largest public markets in the United States. It has been serving the community since 1891, making it over 130 years old. Every Saturday, thousands of people from all over Michigan come to buy fresh fruits, vegetables, flowers, and meats from local farmers and vendors. The market is more than just a place to shop. It is a gathering place where neighbors meet, families spend time together, and the community comes alive. During the summer, the colorful stalls stretch for several city blocks, filled with the sounds of vendors calling out their best deals and the smell of fresh produce in the air. Eastern Market has survived hard times in Detroit, including factory closures and population loss, but it has always remained a symbol of the city's strength and resilience."
  },
  {
    grade: 4,
    topic: "Great Lakes",
    title: "Michigan's Greatest Treasure",
    text: "Michigan is surrounded by four of the five Great Lakes, making it one of the most unique states in the entire country. Lake Superior, Lake Michigan, Lake Huron, and Lake Erie border our state, giving Michigan more freshwater coastline than any other state in America. These lakes provide drinking water for millions of people, support thousands of jobs in fishing and tourism, and create the beautiful shorelines that make Michigan a destination for visitors from around the world. The Great Lakes contain about twenty one percent of the world's surface fresh water. Michigan residents have always understood that these lakes are not just beautiful, they are precious resources that must be protected for future generations."
  },
  {
    grade: 5,
    topic: "Civil Rights",
    title: "Detroit and the Road to Freedom",
    text: "Detroit played a powerful role in the history of civil rights in America. The city was one of the final stops on the Underground Railroad, the secret network of safe houses that helped enslaved people escape to freedom in Canada. Because Detroit sits directly across the river from Windsor, Ontario, thousands of freedom seekers crossed the Detroit River to reach Canada and liberty. Later, Detroit became a center of the civil rights movement in the twentieth century. In 1963, Dr. Martin Luther King Jr. led a march of over 100,000 people down Woodward Avenue, delivering an early version of his famous speech two months before the March on Washington. Detroit's long history of fighting for justice and equality is something every Michigan student should know and be proud of."
  },
  {
    grade: 5,
    topic: "Michigan Industry",
    title: "How Detroit Built the American Dream",
    text: "Detroit is known around the world as the Motor City, and for good reason. In the early twentieth century, Henry Ford revolutionized manufacturing by creating the moving assembly line at his Highland Park plant in 1913. This innovation allowed cars to be built faster and more affordably than ever before, putting automobile ownership within reach of ordinary American families for the first time. At its peak, Detroit's automotive industry employed hundreds of thousands of workers, drawing people from across the United States and around the world to Michigan in search of good paying jobs and a better life. The auto industry helped build the American middle class and made Michigan one of the most prosperous states in the nation."
  },
  {
    grade: 3,
    topic: "Michigan Nature",
    title: "The Sleeping Bear Dunes",
    text: "Sleeping Bear Dunes National Lakeshore sits along the northwestern shore of Michigan's Lower Peninsula, on the coast of Lake Michigan. The park is famous for its enormous sand dunes, some rising more than 400 feet above the lake. According to a Native American legend, the dunes were formed when a mother bear and her two cubs swam across Lake Michigan to escape a forest fire in Wisconsin. The mother bear made it to shore and climbed a bluff to wait for her cubs, but they disappeared beneath the waves. The Great Spirit Manitou created the North and South Manitou Islands to mark where the cubs had sunk, and the lone dune on the mainland became the sleeping mother bear. Today, millions of visitors come to Sleeping Bear Dunes every year to hike, climb the dunes, and enjoy the stunning view of Lake Michigan from the top."
  },
  {
    grade: 3,
    topic: "Animals",
    title: "The Gray Wolf Returns to Michigan",
    text: "For many decades, gray wolves had disappeared from most of Michigan. Hunters and farmers had driven them out because wolves sometimes attacked farm animals. But in the 1990s, wolves from Canada began crossing into the Upper Peninsula of Michigan on their own. Today, Michigan is home to over 600 gray wolves, one of the largest wolf populations in the lower 48 states. Wolves play an important role in the ecosystem. They hunt deer and keep the deer population from growing too large, which helps forests stay healthy. Scientists call this a predator and prey relationship. When one animal is removed from an ecosystem, everything else is affected. The return of wolves to Michigan has taught people an important lesson about how every living thing is connected in nature."
  },
  {
    grade: 6,
    topic: "Dearborn Community",
    title: "Dearborn: Michigan's Arab American Capital",
    text: "Dearborn, Michigan is home to one of the largest Arab American communities outside of the Middle East. People from Lebanon, Yemen, Iraq, and many other countries have made Dearborn their home over the past century, drawn by the jobs available at Ford's River Rouge Complex and other Michigan industries. Today, Dearborn's Arab American community has built a rich cultural life in Michigan, with restaurants, mosques, community centers, and businesses that reflect the traditions and values of their homelands while contributing to the fabric of Michigan life. The Arab American National Museum, located in downtown Dearborn, is the only museum in the United States dedicated to documenting and sharing the Arab American experience."
  },
  {
    grade: 7,
    topic: "Michigan History",
    title: "Motown: The Sound That Changed America",
    text: "In 1959, a young songwriter named Berry Gordy borrowed eight hundred dollars from his family and started a small record label in a house on West Grand Boulevard in Detroit. He called it Motown Records, short for Motor Town, and it would go on to become one of the most successful music companies in American history. Gordy had a vision: create music that would appeal to everyone, regardless of race. During the 1960s, a time of great racial division in America, Motown's artists — including Stevie Wonder, Diana Ross and the Supremes, Marvin Gaye, and the Jackson Five — played on radio stations and in living rooms across the country, reaching both Black and white audiences. Motown music became the soundtrack of the civil rights era, spreading messages of love, hope, and dignity at a time when America desperately needed them. The music born in that little Detroit house still echoes around the world today."
  }
];

const illustratedBooks = [
  {
    grade: 2,
    topic: "Classic Story",
    title: "The Tale of Peter Rabbit",
    author: "Beatrix Potter",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/6/69/An-Original-Illustration-Of-Peter-Rabbit-From-1902-Author-Beatrix-Potter.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once upon a time, there were four little rabbits. Their names were Flopsy, Mopsy, Cotton-tail, and Peter. They lived with their mother under the root of a very big tree.",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/69/An-Original-Illustration-Of-Peter-Rabbit-From-1902-Author-Beatrix-Potter.jpg"
      },
      {
        text: "One day, Peter went into Mr. McGregor's garden. He ate some lettuce, some French beans, and some radishes. He felt very happy eating all the tasty vegetables.",
        image: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Peter-rabbit-albert-47.png"
      },
      {
        text: "Mr. McGregor ran after Peter with a big rake! Peter was very frightened and ran as fast as he could. He lost both of his shoes among the tall cabbages.",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Peter-rabbit-albert-31.png"
      },
      {
        text: "At last, Peter found the gate and slipped underneath it. He ran all the way home to his mother. Peter was safe and sound at last!",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Beatrix-potter-inside-cover-peter_rabbit-transparent.png"
      }
    ]
  },
  {
    grade: 1,
    topic: "Classic Story",
    title: "Goldilocks and the Three Bears",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once there was a girl named Goldilocks. She walked into the forest and found a little house. She knocked on the door, but no one was home, so she walked right in.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b0/And_As_the_Door_Stood_Open.jpg"
      },
      {
        text: "Inside, she saw three chairs at the table. The big chair was too hard. The middle chair was too soft. But the little chair was just right!",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg"
      },
      {
        text: "Goldilocks went upstairs and found three beds. The little bed was just right, and she fell fast asleep. When the three bears came home, they found her there and she ran away into the forest.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg"
      }
    ]
  },
  {
    grade: 2,
    topic: "Classic Story",
    title: "Little Red Riding Hood",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Little_Red_Riding_Hood_Otto_Kubel.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once there was a little girl called Little Red Riding Hood. One day, her mother asked her to bring food to her grandmother. She put her basket on her arm and set off through the woods.",
        image: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Little_Red_Riding_Hood_Otto_Kubel.jpg"
      },
      {
        text: "In the forest, she met a big bad wolf. The wolf asked her where she was going. Little Red Riding Hood told him she was going to her grandmother's house in the woods.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Little_Red_Riding_Hood_-_J._W._Smith.jpg"
      },
      {
        text: "The wolf ran quickly to grandmother's house and got there first. He dressed up in grandmother's clothes and got into bed. Little Red Riding Hood did not know it was the wolf!",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Little_Red_Riding_Hood_and_Wolf.jpg"
      },
      {
        text: "Little Red Riding Hood said, Grandmother, what big eyes you have! Just then, a woodcutter heard her cry and came to help. He rescued Little Red Riding Hood and her grandmother, and they were safe.",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/04/Little_Red_Riding_Hood%E2%80%94So_She_Went_to_the_Bedside.jpg"
      }
    ]
  },
  {
    grade: 3,
    topic: "Classic Story",
    title: "Jack and the Beanstalk",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Jack_and_the_Beanstalk_Cruikshank_1854.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once upon a time, Jack and his mother were very poor. They had only one old cow left. Jack's mother told him to take the cow to market and sell her for money.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/be/Jack_and_the_Beanstalk_Cruikshank_1854.jpg"
      },
      {
        text: "On the way, Jack met a man who gave him magic beans for the cow. His mother threw the beans out the window in anger. But overnight, a giant beanstalk grew all the way up to the sky!",
        image: "https://upload.wikimedia.org/wikipedia/commons/2/27/Page_59_illustration_in_English_Fairy_Tales.png"
      },
      {
        text: "Jack climbed the beanstalk and found a huge castle at the top. Inside lived a terrible giant who shouted, Fee fi fo fum! Jack hid behind a big table and waited quietly.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Jack_and_the_Beanstalk_Giant_-_Project_Gutenberg_eText_17034.jpg"
      },
      {
        text: "Jack grabbed the giant's golden harp and bag of gold coins and ran as fast as he could. The giant chased him all the way down the beanstalk. Jack chopped it down with an axe and the giant fell. Jack and his mother lived happily ever after.",
        image: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Jack_escaping_from_the_Giant.jpg"
      }
    ]
  },
  {
    grade: 1,
    topic: "Classic Story",
    title: "The Three Little Pigs",
    author: "L. Leslie Brooke",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Three_little_pigs%2C_Img008.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once upon a time, three little pigs left home to build their own houses. The first pig built a house of straw. The second pig built a house of sticks. The third pig worked very hard and built a house of bricks.",
        image: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Three_little_pigs%2C_Img008.jpg"
      },
      {
        text: "A big bad wolf came along. He went to the straw house and said, Little pig, little pig, let me come in! The pig said, No! So the wolf huffed and puffed and blew the house down.",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Three_little_pigs%2C_Img010.jpg"
      },
      {
        text: "The wolf blew down the stick house too. Both pigs ran to their brother's brick house as fast as they could. They slammed the door shut just in time.",
        image: "https://upload.wikimedia.org/wikipedia/commons/9/92/Three_little_pigs%2C_Img012.jpg"
      },
      {
        text: "The wolf huffed and puffed with all his might, but he could not blow down the brick house. At last he gave up and ran away into the forest. The three little pigs were safe at last!",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Three_little_pigs%2C_Img014.jpg"
      }
    ]
  },
  {
    grade: 2,
    topic: "Classic Story",
    title: "The Ugly Duckling",
    author: "Hans Christian Andersen",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Hoytema-Het-leelijke-jonge-eendje.jpg",
    type: "illustrated",
    pages: [
      {
        text: "On a farm near a pond, a mother duck sat on her eggs. One by one, the eggs cracked open and little yellow ducklings came out. But one egg was much bigger than the rest.",
        image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Hoytema-Het-leelijke-jonge-eendje.jpg"
      },
      {
        text: "When the big egg hatched, out came a gray, clumsy bird that looked nothing like the others. All the animals on the farm made fun of him and called him the Ugly Duckling.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/40/Le-vilain-petit-canard-10-525b9f59.jpg"
      },
      {
        text: "The ugly duckling ran away and spent a cold, lonely winter hiding by himself. He felt sad because no one wanted to be his friend. He wished more than anything that he could belong somewhere.",
        image: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Le-vilain-petit-canard-13-525bb09e.jpg"
      },
      {
        text: "When spring came, the duckling looked into the water and saw his reflection. He was no longer gray and clumsy. He had grown into a beautiful white swan! The other swans welcomed him, and he was never lonely again.",
        image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Hoytema-Het-leelijke-jonge-eendje.jpg"
      }
    ]
  },
  {
    grade: 3,
    topic: "Classic Story",
    title: "Hansel and Gretel",
    author: "Brothers Grimm",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Hansel_and_Grethal-Rackham-008.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Hansel and Gretel lived with their father and stepmother near a dark forest. One night, Hansel heard his stepmother say they had no food left. He crept outside and filled his pockets with white pebbles.",
        image: "https://upload.wikimedia.org/wikipedia/commons/9/93/Hansel_and_Grethal-Rackham-008.jpg"
      },
      {
        text: "The next morning, their stepmother led them deep into the forest. Hansel secretly dropped white pebbles along the path. When night fell, the moonlight made the pebbles shine, and the children followed them safely home.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Hansel_and_Grethal-Rackham-022.jpg"
      },
      {
        text: "A few days later, they were led into the forest again. This time Hansel dropped breadcrumbs, but birds ate them all up. The children were lost. Deep in the woods they found a house made of gingerbread and candy.",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/33/Hansel_and_Grethal-Rackham-023.jpg"
      },
      {
        text: "Inside the house lived a wicked witch. Gretel was brave and pushed the witch into the oven. The children found chests of jewels in the house and carried them home to their father. They all lived happily ever after.",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/30/Hansel_and_Grethal-Rackham-030.jpg"
      }
    ]
  },
  {
    grade: 4,
    topic: "Classic Story",
    title: "Aladdin and the Magic Lamp",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/4/4a/FOCDarley-Aladdin-and-the-genie.JPG",
    type: "illustrated",
    pages: [
      {
        text: "Long ago in a faraway land, there lived a young boy named Aladdin. He was poor but kind-hearted. One day, a mysterious stranger appeared and promised Aladdin great riches if he would enter a magic cave.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/FOCDarley-Aladdin-and-the-genie.JPG"
      },
      {
        text: "Inside the cave, Aladdin found a dusty old oil lamp. When he rubbed it, a huge genie appeared in a cloud of smoke. I am the Genie of the Lamp, the giant figure boomed. Your wish is my command!",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/FOCDarley-Aladdin-and-the-genie.JPG"
      },
      {
        text: "Aladdin used the genie's power wisely, helping his poor mother and winning the heart of a kind princess. But the mysterious stranger tricked the princess into giving away the lamp.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/FOCDarley-Aladdin-and-the-genie.JPG"
      },
      {
        text: "Aladdin was brave and clever. He outsmarted the stranger and got the lamp back. He used his final wish to set the genie free. From that day on, Aladdin ruled with kindness and lived a long, happy life.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/FOCDarley-Aladdin-and-the-genie.JPG"
      }
    ]
  }
];

const illustratedBooks = [
  {
    grade: 2,
    topic: "Classic Story",
    title: "The Tale of Peter Rabbit",
    author: "Beatrix Potter",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/6/69/An-Original-Illustration-Of-Peter-Rabbit-From-1902-Author-Beatrix-Potter.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once upon a time, there were four little rabbits. Their names were Flopsy, Mopsy, Cotton-tail, and Peter. They lived with their mother under the root of a very big tree.",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/69/An-Original-Illustration-Of-Peter-Rabbit-From-1902-Author-Beatrix-Potter.jpg"
      },
      {
        text: "One day, Peter went into Mr. McGregor's garden. He ate some lettuce, some French beans, and some radishes. He felt very happy eating all the tasty vegetables.",
        image: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Peter-rabbit-albert-47.png"
      },
      {
        text: "Mr. McGregor ran after Peter with a big rake! Peter was very frightened and ran as fast as he could. He lost both of his shoes among the tall cabbages.",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Peter-rabbit-albert-31.png"
      },
      {
        text: "At last, Peter found the gate and slipped underneath it. He ran all the way home to his mother. Peter was safe and sound at last!",
        image: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Beatrix-potter-inside-cover-peter_rabbit-transparent.png"
      }
    ]
  },
  {
    grade: 1,
    topic: "Classic Story",
    title: "Goldilocks and the Three Bears",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once there was a girl named Goldilocks. She walked into the forest and found a little house. She knocked on the door, but no one was home, so she walked right in.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b0/And_As_the_Door_Stood_Open.jpg"
      },
      {
        text: "Inside, she saw three chairs at the table. The big chair was too hard. The middle chair was too soft. But the little chair was just right!",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg"
      },
      {
        text: "Goldilocks went upstairs and found three beds. The little bed was just right, and she fell fast asleep. When the three bears came home, they found her there and she ran away into the forest.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/42/And_Next_She_Saw_Three_Chairs.jpg"
      }
    ]
  },
  {
    grade: 2,
    topic: "Classic Story",
    title: "Little Red Riding Hood",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Little_Red_Riding_Hood_Otto_Kubel.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once there was a little girl called Little Red Riding Hood. One day, her mother asked her to bring food to her grandmother. She put her basket on her arm and set off through the woods.",
        image: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Little_Red_Riding_Hood_Otto_Kubel.jpg"
      },
      {
        text: "In the forest, she met a big bad wolf. The wolf asked her where she was going. Little Red Riding Hood told him she was going to her grandmother's house in the woods.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Little_Red_Riding_Hood_-_J._W._Smith.jpg"
      },
      {
        text: "The wolf ran quickly to grandmother's house and got there first. He dressed up in grandmother's clothes and got into bed. Little Red Riding Hood did not know it was the wolf!",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Little_Red_Riding_Hood_and_Wolf.jpg"
      },
      {
        text: "Little Red Riding Hood said, Grandmother, what big eyes you have! Just then, a woodcutter heard her cry and came to help. He rescued Little Red Riding Hood and her grandmother, and they were safe.",
        image: "https://upload.wikimedia.org/wikipedia/commons/0/04/Little_Red_Riding_Hood%E2%80%94So_She_Went_to_the_Bedside.jpg"
      }
    ]
  },
  {
    grade: 3,
    topic: "Classic Story",
    title: "Jack and the Beanstalk",
    author: "Traditional",
    cover_url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Jack_and_the_Beanstalk_Cruikshank_1854.jpg",
    type: "illustrated",
    pages: [
      {
        text: "Once upon a time, Jack and his mother were very poor. They had only one old cow left. Jack's mother told him to take the cow to market and sell her for money.",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/be/Jack_and_the_Beanstalk_Cruikshank_1854.jpg"
      },
      {
        text: "On the way, Jack met a man who gave him magic beans for the cow. His mother threw the beans out the window in anger. But overnight, a giant beanstalk grew all the way up to the sky!",
        image: "https://upload.wikimedia.org/wikipedia/commons/2/27/Page_59_illustration_in_English_Fairy_Tales.png"
      },
      {
        text: "Jack climbed the beanstalk and found a huge castle at the top. Inside lived a terrible giant who shouted, Fee fi fo fum! Jack hid behind a big table and waited quietly.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Jack_and_the_Beanstalk_Giant_-_Project_Gutenberg_eText_17034.jpg"
      },
      {
        text: "Jack grabbed the giant's golden harp and bag of gold coins and ran as fast as he could. The giant chased him all the way down the beanstalk. Jack chopped it down with an axe and the giant fell. Jack and his mother lived happily ever after.",
        image: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Jack_escaping_from_the_Giant.jpg"
      }
    ]
  }
];
